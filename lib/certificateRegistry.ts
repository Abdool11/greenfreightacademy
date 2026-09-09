import { createHash, createHmac, randomUUID } from "crypto";
import { importPKCS8, importSPKI, jwtVerify, JWTPayload, SignJWT } from "jose";
import { supabaseAdmin } from "@/lib/supabase";
import { buildCertificatePdf } from "@/lib/certificatePdf";

const CERTIFICATE_BUCKET = "gfa-certificate-documents";
const CERTIFICATE_ISSUER = "betterdriver";
const CERTIFICATE_AUDIENCE = "gfa-certificate-registry";
const CERTIFICATE_KEY_ID = "betterdriver-certificate-v1";
const GFA_RESPONSE_ISSUER = "gfa-certificate-registry";
const BETTERDRIVER_RESPONSE_AUDIENCE = "betterdriver-certificate-presentation";
const GFA_RESPONSE_KEY_ID = "gfa-certificate-response-v1";
const DOCUMENT_GRANT_TTL_SECONDS = 60;

type CertificateAction = "issue_certificate" | "request_document_grant";

export interface VerifiedCertificateEvent {
  action: CertificateAction;
  eventId: string;
  externalSubjectRef: string;
  enrolmentId: string;
  occurredAt: string;
  certificateVersion: string;
}

interface CertificateRow {
  id: string;
  certificate_number: string;
  certificate_version: string | null;
  status: string | null;
  issued_at: string;
  expires_at: string | null;
  document_storage_path: string | null;
  document_sha256: string | null;
  driver_id: string;
  enrolment_id: string | null;
  course_id: string | null;
}

interface CertificateDisplayRow extends CertificateRow {
  drivers: { first_name: string; last_name: string } | null;
  courses: { name: string } | null;
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function normalisePem(value: string) {
  return value.replace(/\\n/g, "\n");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasSafeOpaqueReference(value: string) {
  return /^[A-Za-z0-9_-]{8,160}$/.test(value);
}

function hasSafeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function hasSafeVersion(value: string) {
  return /^[A-Za-z0-9._-]{1,32}$/.test(value);
}

function safeEventPayload(payload: JWTPayload): VerifiedCertificateEvent {
  const action = payload.action;
  const eventId = payload.jti;
  const externalSubjectRef = payload.external_subject_ref;
  const enrolmentId = payload.enrolment_id;
  const occurredAt = payload.occurred_at;
  const certificateVersion = payload.certificate_version ?? "v1";

  if (
    (action !== "issue_certificate" && action !== "request_document_grant") ||
    !isNonEmptyString(eventId) ||
    !isNonEmptyString(externalSubjectRef) ||
    !isNonEmptyString(enrolmentId) ||
    !isNonEmptyString(occurredAt) ||
    !isNonEmptyString(certificateVersion) ||
    !hasSafeOpaqueReference(externalSubjectRef) ||
    !hasSafeUuid(enrolmentId) ||
    !hasSafeVersion(certificateVersion) ||
    Number.isNaN(Date.parse(occurredAt))
  ) {
    throw new Error("The certificate event claims are incomplete or invalid.");
  }

  return {
    action,
    eventId,
    externalSubjectRef,
    enrolmentId,
    occurredAt,
    certificateVersion,
  };
}

export async function signBetterDriverCertificateResponse(claims: Record<string, unknown>) {
  const privateKey = await importPKCS8(
    normalisePem(requiredEnv("GFA_CERTIFICATE_RESPONSE_PRIVATE_KEY_PEM")),
    "RS256"
  );
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: GFA_RESPONSE_KEY_ID, typ: "JWT" })
    .setIssuer(GFA_RESPONSE_ISSUER)
    .setAudience(BETTERDRIVER_RESPONSE_AUDIENCE)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(`${DOCUMENT_GRANT_TTL_SECONDS}s`)
    .sign(privateKey);
}

export async function verifyBetterDriverCertificateEvent(request: Request): Promise<VerifiedCertificateEvent> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new Error("Missing signed BetterDriver certificate event.");

  const publicKey = await importSPKI(
    normalisePem(requiredEnv("BD_CERTIFICATE_EVENT_PUBLIC_KEY_PEM")),
    "RS256"
  );
  const { payload, protectedHeader } = await jwtVerify(token, publicKey, {
    algorithms: ["RS256"],
    issuer: CERTIFICATE_ISSUER,
    audience: CERTIFICATE_AUDIENCE,
    clockTolerance: 5,
  });

  if (protectedHeader.kid !== CERTIFICATE_KEY_ID || typeof payload.exp !== "number") {
    throw new Error("The certificate event signing key or expiry is invalid.");
  }

  return safeEventPayload(payload);
}

function auditFingerprint(value: string) {
  return createHmac("sha256", requiredEnv("GFA_CERTIFICATE_AUDIT_SECRET"))
    .update(value)
    .digest("hex");
}

function documentGrantCode(requestId: string) {
  return createHmac("sha256", requiredEnv("GFA_CERTIFICATE_DOCUMENT_GRANT_SECRET"))
    .update(`gfa-certificate-document-grant:${requestId}`)
    .digest("base64url");
}

function certificatePublicUrl(certificateNumber: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");
  return `${base}/verify?certificate=${encodeURIComponent(certificateNumber)}`;
}

async function findMappedEnrolment(event: VerifiedCertificateEvent) {
  const { data: mapping, error: mappingError } = await supabaseAdmin
    .from("driver_external_identities")
    .select("driver_id")
    .eq("external_system", "betterdriver")
    .eq("external_subject_ref", event.externalSubjectRef)
    .is("deactivated_at", null)
    .maybeSingle();
  if (mappingError || !mapping) throw new Error("The BetterDriver subject mapping was not found.");

  const { data: enrolment, error: enrolmentError } = await supabaseAdmin
    .from("enrolments")
    .select("id, driver_id, company_id, course_id, status, progress_percent")
    .eq("id", event.enrolmentId)
    .eq("driver_id", mapping.driver_id)
    .maybeSingle();
  if (enrolmentError || !enrolment) throw new Error("The certificate enrolment mapping was not found.");

  return enrolment;
}

async function renderAndStoreCertificate(certificateId: string) {
  const { data, error } = await supabaseAdmin
    .from("certifications")
    .select("id, certificate_number, certificate_version, status, issued_at, expires_at, document_storage_path, document_sha256, driver_id, enrolment_id, course_id, drivers(first_name,last_name), courses(name)")
    .eq("id", certificateId)
    .maybeSingle();
  const certificate = data as CertificateDisplayRow | null;
  if (error || !certificate) throw new Error("The issued certificate could not be reloaded.");

  if (certificate.document_storage_path && certificate.document_sha256 && ["active", "issued"].includes(certificate.status ?? "")) {
    return certificate;
  }
  if (!certificate.drivers || !certificate.courses) throw new Error("Certificate learner or programme data is unavailable.");

  const learnerName = `${certificate.drivers.first_name} ${certificate.drivers.last_name}`.trim();
  const { buffer, sha256 } = await buildCertificatePdf({
    certificateNumber: certificate.certificate_number,
    certificateVersion: certificate.certificate_version || "v1",
    learnerName,
    programmeName: certificate.courses.name,
    issuedAt: certificate.issued_at,
    expiresAt: certificate.expires_at,
    verificationUrl: certificatePublicUrl(certificate.certificate_number),
  });
  const documentPath = `certificates/${certificate.id}/${certificate.certificate_version || "v1"}.pdf`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(CERTIFICATE_BUCKET)
    .upload(documentPath, buffer, { contentType: "application/pdf", upsert: false });

  if (uploadError && !/already exists/i.test(uploadError.message)) {
    throw new Error("The private certificate PDF could not be stored.");
  }

  const { error: updateError } = await supabaseAdmin
    .from("certifications")
    .update({
      document_storage_path: documentPath,
      document_sha256: sha256,
      document_generated_at: new Date().toISOString(),
      status: "active",
    })
    .eq("id", certificate.id);
  if (updateError) throw new Error("The certificate document metadata could not be saved.");

  return { ...certificate, document_storage_path: documentPath, document_sha256: sha256, status: "active" };
}

export async function issueCanonicalCertificate(event: VerifiedCertificateEvent) {
  if (event.action !== "issue_certificate") throw new Error("The signed action is not a certificate issue event.");
  const enrolment = await findMappedEnrolment(event);

  const { data: eventRow, error: eventError } = await supabaseAdmin
    .from("learning_events")
    .insert({
      source: "betterdriver",
      external_event_id: event.eventId,
      event_type: "certificate_issued",
      company_id: enrolment.company_id,
      driver_id: enrolment.driver_id,
      enrolment_id: enrolment.id,
      occurred_at: event.occurredAt,
      payload: {
        contract: "gfa-certificate-registry-v1",
        external_subject_ref: event.externalSubjectRef,
        certificate_version: event.certificateVersion,
      },
    })
    .select("id")
    .maybeSingle();

  let learningEventId = eventRow?.id as string | undefined;
  if (eventError?.code === "23505") {
    const { data: duplicate } = await supabaseAdmin
      .from("learning_events")
      .select("id")
      .eq("source", "betterdriver")
      .eq("external_event_id", event.eventId)
      .eq("event_type", "certificate_issued")
      .maybeSingle();
    learningEventId = duplicate?.id;
  } else if (eventError || !learningEventId) {
    throw new Error("The certificate issue event could not be recorded.");
  }

  const { data: issuedRows, error: issueError } = await supabaseAdmin
    .rpc("gfa_issue_certificate_from_learning_event", {
      p_learning_event_id: learningEventId,
      p_certificate_version: event.certificateVersion,
    });
  const issued = Array.isArray(issuedRows) ? issuedRows[0] : issuedRows;
  if (issueError || !issued?.certificate_id) throw new Error("The canonical certificate could not be issued.");

  const now = new Date().toISOString();
  const { error: enrolmentError } = await supabaseAdmin
    .from("enrolments")
    .update({ status: "certified", certified: true, certified_at: event.occurredAt, progress_percent: 100, moodle_last_synced_at: now })
    .eq("id", enrolment.id);
  if (enrolmentError) {
    await supabaseAdmin.from("learning_events").update({ processing_error: enrolmentError.message }).eq("id", learningEventId);
    throw new Error("The certificate event was recorded but the enrolment could not be updated.");
  }

  const certificate = await renderAndStoreCertificate(issued.certificate_id as string);
  await supabaseAdmin.from("learning_events").update({ processed_at: now, processing_error: null }).eq("id", learningEventId);
  return { certificate, created: Boolean(issued.created) };
}

export async function createBetterDriverDocumentGrant(event: VerifiedCertificateEvent) {
  if (event.action !== "request_document_grant") throw new Error("The signed action is not a document-grant request.");
  const enrolment = await findMappedEnrolment(event);
  const { data: certificate, error } = await supabaseAdmin
    .from("certifications")
    .select("id, certificate_number, status, document_storage_path, enrolment_id")
    .eq("enrolment_id", enrolment.id)
    .in("status", ["active", "issued"])
    .not("document_storage_path", "is", null)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !certificate) throw new Error("No active GFA certificate document is available for this enrolment.");

  const authorizationCode = documentGrantCode(event.eventId);
  const authorizationCodeHash = createHash("sha256").update(authorizationCode).digest("hex");
  const expiresAt = new Date(Date.now() + DOCUMENT_GRANT_TTL_SECONDS * 1000).toISOString();
  const { error: insertError } = await supabaseAdmin
    .from("certificate_delivery_grants")
    .insert({
      certificate_id: certificate.id,
      audience: "betterdriver",
      authorization_code_hash: authorizationCodeHash,
      request_id: event.eventId,
      expires_at: expiresAt,
    });
  if (insertError?.code === "23505") {
    const { data: duplicate } = await supabaseAdmin
      .from("certificate_delivery_grants")
      .select("certificate_id, expires_at")
      .eq("audience", "betterdriver")
      .eq("request_id", event.eventId)
      .maybeSingle();
    if (!duplicate || duplicate.certificate_id !== certificate.id) throw new Error("The document-grant request could not be reconciled safely.");
    return { authorizationCode, expiresAt: duplicate.expires_at };
  }
  if (insertError) throw new Error("The one-time document grant could not be created.");

  return { authorizationCode, expiresAt };
}

export async function redeemBetterDriverDocumentGrant(authorizationCode: string) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(authorizationCode)) return null;
  const codeHash = createHash("sha256").update(authorizationCode).digest("hex");
  const { data: rows, error } = await supabaseAdmin
    .rpc("gfa_redeem_certificate_delivery_grant", { p_authorization_code_hash: codeHash });
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (error || !row?.certificate_id || !row?.document_storage_path) return null;
  const { data: signed, error: signedError } = await supabaseAdmin.storage
    .from(CERTIFICATE_BUCKET)
    .createSignedUrl(row.document_storage_path as string, DOCUMENT_GRANT_TTL_SECONDS, { download: true });
  if (signedError || !signed?.signedUrl) {
    await supabaseAdmin.from("certificate_document_access_events").insert({ certificate_id: row.certificate_id, audience: "betterdriver", outcome: "unavailable" });
    return null;
  }
  await supabaseAdmin.from("certificate_document_access_events").insert({ certificate_id: row.certificate_id, audience: "betterdriver", outcome: "granted" });
  return signed.signedUrl;
}

export function certificateVerificationFingerprint(value: string) {
  return auditFingerprint(value);
}

export async function consumeVerificationAllowance(requestFingerprint: string) {
  const { data, error } = await supabaseAdmin.rpc("gfa_consume_certificate_verification_limit", {
    p_request_fingerprint: requestFingerprint,
    p_max_requests: 10,
    p_window_seconds: 60,
  });
  return !error && data === true;
}

export async function auditCertificateVerification(
  certificateId: string | null,
  queryFingerprint: string,
  requestFingerprint: string | null,
  outcome: "verified" | "expired" | "revoked" | "not_found" | "invalid_request" | "rate_limited"
) {
  await supabaseAdmin.from("certificate_verification_events").insert({
    certificate_id: certificateId,
    query_fingerprint: queryFingerprint,
    request_fingerprint: requestFingerprint,
    outcome,
  });
}

export const certificateFeatureEnabled = () => process.env.ENABLE_GFA_CERTIFICATE_REGISTRY === "true";
export const certificateVerificationEnabled = () => process.env.ENABLE_GFA_CERTIFICATE_VERIFICATION === "true";
export const certificateDocumentsEnabled = () => process.env.ENABLE_GFA_CERTIFICATE_DOCUMENTS === "true";
export const certificateBucketName = () => CERTIFICATE_BUCKET;
export const certificateEventContract = () => ({ issuer: CERTIFICATE_ISSUER, audience: CERTIFICATE_AUDIENCE, keyId: CERTIFICATE_KEY_ID });
export const certificateResponseContract = () => ({ issuer: GFA_RESPONSE_ISSUER, audience: BETTERDRIVER_RESPONSE_AUDIENCE, keyId: GFA_RESPONSE_KEY_ID });
export const newCertificateEventId = () => randomUUID();
