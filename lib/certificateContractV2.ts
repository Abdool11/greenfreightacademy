import { createHash, createHmac, randomUUID } from "crypto";
import { importPKCS8, importSPKI, jwtVerify, JWTPayload, SignJWT } from "jose";
import { supabaseAdmin } from "@/lib/supabase";
import { buildCertificatePdf } from "@/lib/certificatePdf";

const CERTIFICATE_BUCKET = "gfa-certificate-documents";
const CONTRACT_ISSUER = "betterdriver";
const COMPLETION_AUDIENCE = "gfa-certificate-registry-v2";
const HANDOFF_AUDIENCE = "gfa-certificate-handoff-v2";
const STATUS_LOOKUP_AUDIENCE = "gfa-certificate-status-lookup-v2";
const CONTRACT_KEY_ID = "betterdriver-certificate-contract-v2";
const GFA_STATUS_ISSUER = "gfa-certificate-registry";
const GFA_STATUS_AUDIENCE = "betterdriver-gfa-certificate-status-v1";
const GFA_STATUS_KEY_ID = "gfa-certificate-status-v1";
const HANDOFF_TTL_SECONDS = 300;
const RESPONSE_TTL_SECONDS = 300;

export type CertificateLifecycleStatus =
  | "PENDING_REVIEW"
  | "ISSUED"
  | "SUPERSEDED"
  | "EXPIRED"
  | "REVOKED"
  | "NOT_ELIGIBLE";

export type HandoffAction = "view" | "download";

export interface CompletionEvidence {
  eventId: string;
  occurredAt: string;
  driverRef: string;
  companyRef: string;
  enrolmentRef: string;
  completionEvidenceRef: string;
  programmeCode: string;
  programmeVersion: string;
  assessmentStatus: "COMPLETE";
  evidenceVersion: string;
}

export interface HandoffAssertion {
  eventId: string;
  occurredAt: string;
  driverRef: string;
  certificateRef: string;
  action: HandoffAction;
}

export interface StatusLookupAssertion {
  eventId: string;
  driverRef: string;
  certificateRef?: string;
}

interface MappingRow {
  driver_id: string;
  company_id: string;
  enrolment_id: string;
  programme_code: string;
  programme_version: string;
}

interface CertificateContractRow {
  id: string;
  certificate_ref: string;
  certificate_number: string | null;
  certificate_version: string | null;
  lifecycle_status: CertificateLifecycleStatus;
  status: string | null;
  issued_at: string | null;
  expires_at: string | null;
  document_storage_path: string | null;
  decision_event_id: string | null;
  driver_id: string;
  enrolment_id: string | null;
  course_id: string | null;
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

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOpaqueReference(value: string) {
  return /^[A-Za-z0-9_-]{8,180}$/.test(value);
}

function isVersion(value: string) {
  return /^[A-Za-z0-9._-]{1,48}$/.test(value);
}

function isIsoDate(value: string) {
  return !Number.isNaN(Date.parse(value));
}

function publicVerificationUrl(certificateNumber: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");
  return `${base}/verify?certificate=${encodeURIComponent(certificateNumber)}`;
}

function handoffCode(eventId: string) {
  return createHmac("sha256", requiredEnv("GFA_CERTIFICATE_HANDOFF_SECRET"))
    .update(`gfa-certificate-handoff-v2:${eventId}`)
    .digest("base64url");
}

function handoffCodeHash(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function assertContractHeader(payload: JWTPayload, header: { kid?: string }) {
  if (header.kid !== CONTRACT_KEY_ID || typeof payload.exp !== "number" || typeof payload.jti !== "string") {
    throw new Error("Certificate contract signing key, expiry or event identifier is invalid.");
  }
}

async function verifySignedBetterDriverAssertion(request: Request, audience: string) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new Error("Missing signed BetterDriver assertion.");

  const publicKey = await importSPKI(normalisePem(requiredEnv("BD_CERTIFICATE_EVENT_PUBLIC_KEY_PEM")), "RS256");
  const verified = await jwtVerify(token, publicKey, {
    algorithms: ["RS256"],
    issuer: CONTRACT_ISSUER,
    audience,
    clockTolerance: 5,
  });
  assertContractHeader(verified.payload, verified.protectedHeader);
  return verified.payload;
}

export async function verifyCompletionEvidence(request: Request): Promise<CompletionEvidence> {
  const payload = await verifySignedBetterDriverAssertion(request, COMPLETION_AUDIENCE);
  const schemaVersion = payload.schema_version;
  const eventType = payload.event_type;
  const driverRef = payload.driver_ref;
  const companyRef = payload.company_ref;
  const enrolmentRef = payload.enrolment_ref;
  const completionEvidenceRef = payload.completion_evidence_ref;
  const programmeCode = payload.programme_code;
  const programmeVersion = payload.programme_version;
  const occurredAt = payload.occurred_at;
  const assessment = payload.assessment_summary as Record<string, unknown> | undefined;

  if (
    schemaVersion !== "1.0" ||
    eventType !== "bd.learning_completion_evidence.v1" ||
    !isString(payload.jti) ||
    !isString(driverRef) ||
    !isString(companyRef) ||
    !isString(enrolmentRef) ||
    !isString(completionEvidenceRef) ||
    !isString(programmeCode) ||
    !isString(programmeVersion) ||
    !isString(occurredAt) ||
    !isOpaqueReference(driverRef) ||
    !isOpaqueReference(companyRef) ||
    !isOpaqueReference(enrolmentRef) ||
    !isOpaqueReference(completionEvidenceRef) ||
    !isVersion(programmeCode) ||
    !isVersion(programmeVersion) ||
    !isIsoDate(occurredAt) ||
    assessment?.status !== "COMPLETE" ||
    assessment?.evidence_version !== "1.0"
  ) {
    throw new Error("The completion-evidence claims are incomplete or invalid.");
  }

  return {
    eventId: payload.jti,
    occurredAt,
    driverRef,
    companyRef,
    enrolmentRef,
    completionEvidenceRef,
    programmeCode,
    programmeVersion,
    assessmentStatus: "COMPLETE",
    evidenceVersion: "1.0",
  };
}

export async function verifyDriverHandoffAssertion(request: Request): Promise<HandoffAssertion> {
  const payload = await verifySignedBetterDriverAssertion(request, HANDOFF_AUDIENCE);
  const action = payload.action;
  const driverRef = payload.driver_ref;
  const certificateRef = payload.certificate_ref;
  const occurredAt = payload.occurred_at;

  if (
    payload.schema_version !== "1.0" ||
    payload.event_type !== "bd.gfa_certificate_handoff.v1" ||
    !isString(payload.jti) ||
    !isString(driverRef) ||
    !isString(certificateRef) ||
    !isString(occurredAt) ||
    !isOpaqueReference(driverRef) ||
    !/^gfa_cert_[A-Za-z0-9_-]{16,64}$/.test(certificateRef) ||
    !isIsoDate(occurredAt) ||
    (action !== "view" && action !== "download")
  ) {
    throw new Error("The certificate handoff claims are incomplete or invalid.");
  }

  if (typeof payload.iat !== "number" || typeof payload.exp !== "number" || payload.exp - payload.iat > HANDOFF_TTL_SECONDS) {
    throw new Error("The certificate handoff assertion exceeds the approved lifetime.");
  }

  return { eventId: payload.jti, occurredAt, driverRef, certificateRef, action };
}

export async function verifyCertificateStatusLookup(request: Request): Promise<StatusLookupAssertion> {
  const payload = await verifySignedBetterDriverAssertion(request, STATUS_LOOKUP_AUDIENCE);
  const driverRef = payload.driver_ref;
  const certificateRef = payload.certificate_ref;
  if (
    payload.schema_version !== "1.0" ||
    payload.event_type !== "bd.gfa_certificate_status_lookup.v1" ||
    !isString(payload.jti) ||
    !isString(driverRef) ||
    !isOpaqueReference(driverRef) ||
    (certificateRef !== undefined && (!isString(certificateRef) || !/^gfa_cert_[A-Za-z0-9_-]{16,64}$/.test(certificateRef)))
  ) {
    throw new Error("The certificate status lookup claims are incomplete or invalid.");
  }
  return { eventId: payload.jti, driverRef, certificateRef: certificateRef as string | undefined };
}

async function findMapping(driverRef: string, companyRef: string, enrolmentRef: string): Promise<MappingRow> {
  const { data, error } = await supabaseAdmin
    .from("certificate_external_mappings")
    .select("driver_id, company_id, enrolment_id, programme_code, programme_version")
    .eq("external_system", "betterdriver")
    .eq("external_driver_ref", driverRef)
    .eq("external_company_ref", companyRef)
    .eq("external_enrolment_ref", enrolmentRef)
    .is("deactivated_at", null)
    .maybeSingle();
  if (error || !data) throw new Error("The approved BetterDriver enrolment mapping was not found.");
  return data as MappingRow;
}

async function findActiveDriverMapping(driverRef: string) {
  const { data, error } = await supabaseAdmin
    .from("certificate_external_mappings")
    .select("driver_id, company_id, enrolment_id, programme_code, programme_version")
    .eq("external_system", "betterdriver")
    .eq("external_driver_ref", driverRef)
    .is("deactivated_at", null)
    .maybeSingle();
  if (error || !data) throw new Error("The approved BetterDriver driver mapping was not found.");
  return data as MappingRow;
}

async function loadCertificate(certificateId: string) {
  const { data, error } = await supabaseAdmin
    .from("certifications")
    .select("id, certificate_ref, certificate_number, certificate_version, lifecycle_status, status, issued_at, expires_at, document_storage_path, decision_event_id, driver_id, enrolment_id, course_id, drivers(first_name,last_name), courses(name)")
    .eq("id", certificateId)
    .maybeSingle();
  if (error || !data) throw new Error("The GFA certificate record was not found.");
  return data as unknown as CertificateContractRow;
}

export async function receiveCompletionEvidence(evidence: CompletionEvidence) {
  const mapping = await findMapping(evidence.driverRef, evidence.companyRef, evidence.enrolmentRef);
  if (mapping.programme_code !== evidence.programmeCode || mapping.programme_version !== evidence.programmeVersion) {
    throw new Error("The completion evidence programme does not match the approved GFA mapping.");
  }

  const { data: existingEvent, error: existingError } = await supabaseAdmin
    .from("certificate_decision_events")
    .select("id, decision_status")
    .eq("source_system", "betterdriver")
    .eq("source_event_id", evidence.eventId)
    .maybeSingle();
  if (existingError) throw new Error("The completion evidence could not be checked safely.");

  if (existingEvent) {
    const { data: existingCertificate, error: certificateError } = await supabaseAdmin
      .from("certifications")
      .select("id, certificate_ref, lifecycle_status, certificate_number, issued_at, expires_at")
      .eq("decision_event_id", existingEvent.id)
      .maybeSingle();
    if (certificateError) throw new Error("The prior GFA decision could not be reloaded.");
    return {
      created: false,
      certificateRef: existingCertificate?.certificate_ref ?? null,
      lifecycleStatus: (existingCertificate?.lifecycle_status ?? existingEvent.decision_status) as CertificateLifecycleStatus,
      issuedAt: existingCertificate?.issued_at ?? null,
      expiresAt: existingCertificate?.expires_at ?? null,
    };
  }

  const { data: decisionEvent, error: decisionError } = await supabaseAdmin
    .from("certificate_decision_events")
    .insert({
      source_system: "betterdriver",
      source_event_id: evidence.eventId,
      schema_version: "1.0",
      event_type: "bd.learning_completion_evidence.v1",
      completion_evidence_ref: evidence.completionEvidenceRef,
      external_driver_ref: evidence.driverRef,
      external_company_ref: evidence.companyRef,
      external_enrolment_ref: evidence.enrolmentRef,
      programme_code: evidence.programmeCode,
      programme_version: evidence.programmeVersion,
      driver_id: mapping.driver_id,
      company_id: mapping.company_id,
      enrolment_id: mapping.enrolment_id,
      occurred_at: evidence.occurredAt,
      decision_status: "PENDING_REVIEW",
      payload: { assessment_status: evidence.assessmentStatus, evidence_version: evidence.evidenceVersion },
      processed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (decisionError || !decisionEvent) throw new Error("The completion evidence could not be recorded.");

  const { data: course, error: courseError } = await supabaseAdmin
    .from("enrolments")
    .select("course_id, courses(name)")
    .eq("id", mapping.enrolment_id)
    .eq("driver_id", mapping.driver_id)
    .eq("company_id", mapping.company_id)
    .maybeSingle();
  if (courseError || !course?.course_id) throw new Error("The mapped GFA enrolment is no longer available.");

  const certificateRef = `gfa_cert_${randomUUID().replace(/-/g, "")}`;
  const { data: certificate, error: certificateError } = await supabaseAdmin
    .from("certifications")
    .insert({
      driver_id: mapping.driver_id,
      company_id: mapping.company_id,
      enrolment_id: mapping.enrolment_id,
      course_id: course.course_id,
      certificate_ref: certificateRef,
      certificate_number: null,
      programme: (course.courses as { name?: string } | null)?.name ?? evidence.programmeCode,
      status: "pending_review",
      lifecycle_status: "PENDING_REVIEW",
      certificate_version: evidence.programmeVersion,
      decision_event_id: decisionEvent.id,
      lifecycle_updated_at: new Date().toISOString(),
    })
    .select("id, certificate_ref, lifecycle_status")
    .single();

  if (certificateError || !certificate) {
    await supabaseAdmin.from("certificate_decision_events").update({ outcome_detail: "certificate record creation failed" }).eq("id", decisionEvent.id);
    throw new Error("The GFA pending certificate could not be created.");
  }

  return { created: true, certificateRef: certificate.certificate_ref, lifecycleStatus: certificate.lifecycle_status as CertificateLifecycleStatus, issuedAt: null, expiresAt: null };
}

export async function renderAndStoreIssuedCertificate(certificateId: string) {
  const certificate = await loadCertificate(certificateId);
  if (certificate.lifecycle_status !== "ISSUED" || !certificate.certificate_number) {
    throw new Error("Only an issued GFA certificate can receive a document.");
  }
  if (certificate.document_storage_path) return certificate;
  if (!certificate.drivers || !certificate.courses) throw new Error("Certificate learner or programme data is unavailable.");

  const { buffer, sha256 } = await buildCertificatePdf({
    certificateNumber: certificate.certificate_number,
    certificateVersion: certificate.certificate_version || "v1",
    learnerName: `${certificate.drivers.first_name} ${certificate.drivers.last_name}`.trim(),
    programmeName: certificate.courses.name,
    issuedAt: certificate.issued_at || new Date().toISOString(),
    expiresAt: certificate.expires_at,
    verificationUrl: publicVerificationUrl(certificate.certificate_number),
  });
  const documentPath = `certificates/${certificate.id}/${certificate.certificate_version || "v1"}.pdf`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(CERTIFICATE_BUCKET)
    .upload(documentPath, buffer, { contentType: "application/pdf", upsert: false });
  if (uploadError && !/already exists/i.test(uploadError.message)) throw new Error("The private GFA certificate PDF could not be stored.");

  const { error: updateError } = await supabaseAdmin
    .from("certifications")
    .update({ document_storage_path: documentPath, document_sha256: sha256, document_generated_at: new Date().toISOString(), status: "active", lifecycle_updated_at: new Date().toISOString() })
    .eq("id", certificate.id);
  if (updateError) throw new Error("The GFA certificate document metadata could not be saved.");
  return { ...certificate, document_storage_path: documentPath, status: "active" };
}

export async function issuePendingCertificate(certificateId: string) {
  const { data: rows, error } = await supabaseAdmin.rpc("gfa_issue_pending_certificate", { p_certificate_id: certificateId });
  const issued = Array.isArray(rows) ? rows[0] : rows;
  if (error || !issued?.certificate_id) throw new Error("The GFA certificate decision could not be issued.");
  const certificate = await renderAndStoreIssuedCertificate(issued.certificate_id as string);
  await supabaseAdmin
    .from("certificate_decision_events")
    .update({ decision_status: "ISSUED", processed_at: new Date().toISOString(), outcome_detail: null })
    .eq("id", certificate.decision_event_id ?? "00000000-0000-0000-0000-000000000000");
  return certificate;
}

function currentLifecycle(certificate: CertificateContractRow): CertificateLifecycleStatus {
  if (certificate.lifecycle_status === "REVOKED" || certificate.status === "revoked") return "REVOKED";
  if (certificate.lifecycle_status === "SUPERSEDED" || certificate.status === "superseded") return "SUPERSEDED";
  if (certificate.expires_at && new Date(certificate.expires_at).getTime() < Date.now()) return "EXPIRED";
  return certificate.lifecycle_status;
}

async function signCertificateStatusPayload(payload: Record<string, unknown>) {
  const privateKey = await importPKCS8(normalisePem(requiredEnv("GFA_CERTIFICATE_RESPONSE_PRIVATE_KEY_PEM")), "RS256");
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: GFA_STATUS_KEY_ID, typ: "JWT" })
    .setIssuer(GFA_STATUS_ISSUER)
    .setAudience(GFA_STATUS_AUDIENCE)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(`${RESPONSE_TTL_SECONDS}s`)
    .sign(privateKey);
}

export async function signCertificateStatusAssertion(certificate: CertificateContractRow) {
  return signCertificateStatusPayload({
    schema_version: "1.0",
    event_type: "gfa.certificate_status.v1",
    certificate_ref: certificate.certificate_ref,
    certificate_version: certificate.certificate_version || "v1",
    qualification_title: certificate.courses?.name ?? "Green Freight Academy programme",
    status: currentLifecycle(certificate),
    issued_at: certificate.issued_at,
    expires_at: certificate.expires_at,
    public_verification_url: certificate.certificate_number ? publicVerificationUrl(certificate.certificate_number) : null,
    document_access: { available: currentLifecycle(certificate) === "ISSUED" && Boolean(certificate.document_storage_path), access_method: "GFA_SCOPED_HANDOFF" },
  });
}

export async function signPendingCertificateStatus(certificateRef: string, programmeCode: string, programmeVersion: string) {
  return signCertificateStatusPayload({
    schema_version: "1.0",
    event_type: "gfa.certificate_status.v1",
    certificate_ref: certificateRef,
    certificate_version: programmeVersion,
    qualification_code: programmeCode,
    qualification_title: "Pending Green Freight Academy review",
    status: "PENDING_REVIEW",
    issued_at: null,
    expires_at: null,
    public_verification_url: null,
    document_access: { available: false, access_method: "GFA_SCOPED_HANDOFF" },
  });
}

export async function lookupCertificateStatus(driverRef: string, certificateRef?: string) {
  const mapping = await findActiveDriverMapping(driverRef);
  let query = supabaseAdmin
    .from("certifications")
    .select("id, certificate_ref, certificate_number, certificate_version, lifecycle_status, status, issued_at, expires_at, document_storage_path, decision_event_id, driver_id, enrolment_id, course_id, drivers(first_name,last_name), courses(name)")
    .eq("driver_id", mapping.driver_id)
    .eq("enrolment_id", mapping.enrolment_id);
  if (certificateRef) query = query.eq("certificate_ref", certificateRef);
  const { data, error } = await query.order("issued_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  if (error || !data) throw new Error("No GFA certificate status is available for this BetterDriver driver mapping.");
  return data as unknown as CertificateContractRow;
}

export async function createOpaqueBrowserHandoff(assertion: HandoffAssertion) {
  const mapping = await findActiveDriverMapping(assertion.driverRef);
  const { data: certificate, error } = await supabaseAdmin
    .from("certifications")
    .select("id, certificate_ref, driver_id, lifecycle_status, status, expires_at, document_storage_path")
    .eq("certificate_ref", assertion.certificateRef)
    .eq("driver_id", mapping.driver_id)
    .maybeSingle();
  if (error || !certificate) throw new Error("The requested GFA certificate is unavailable for this driver.");
  if (certificate.lifecycle_status !== "ISSUED" || !["active", "issued"].includes(certificate.status ?? "") || !certificate.document_storage_path) {
    throw new Error("The requested GFA certificate is not available for protected document access.");
  }
  if (certificate.expires_at && new Date(certificate.expires_at).getTime() < Date.now()) throw new Error("The requested GFA certificate is no longer current.");

  const code = handoffCode(assertion.eventId);
  const expiresAt = new Date(Date.now() + HANDOFF_TTL_SECONDS * 1000).toISOString();
  const { error: insertError } = await supabaseAdmin
    .from("certificate_handoff_sessions")
    .insert({
      handoff_jti: assertion.eventId,
      handoff_code_hash: handoffCodeHash(code),
      certificate_id: certificate.id,
      driver_id: mapping.driver_id,
      audience: "betterdriver",
      permitted_action: assertion.action,
      expires_at: expiresAt,
    });
  if (insertError?.code !== "23505" && insertError) throw new Error("The GFA handoff session could not be created.");
  return { handoffCode: code, expiresAt };
}

export async function redeemOpaqueBrowserHandoff(code: string) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(code)) return null;
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("certificate_handoff_sessions")
    .select("permitted_action")
    .eq("handoff_code_hash", handoffCodeHash(code))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (sessionError || !session) return null;

  const { data: rows, error } = await supabaseAdmin.rpc("gfa_redeem_certificate_handoff", {
    p_handoff_code_hash: handoffCodeHash(code),
  });
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (error || !row?.certificate_id || !row?.document_storage_path) return null;
  const { data: signed, error: signedError } = await supabaseAdmin.storage
    .from(CERTIFICATE_BUCKET)
    .createSignedUrl(row.document_storage_path as string, 60, { download: session.permitted_action === "download" });
  if (signedError || !signed?.signedUrl) {
    await supabaseAdmin.from("certificate_document_access_events").insert({ certificate_id: row.certificate_id, audience: "betterdriver", outcome: "unavailable" });
    return null;
  }
  await supabaseAdmin.from("certificate_document_access_events").insert({ certificate_id: row.certificate_id, audience: "betterdriver", outcome: "granted" });
  return { signedUrl: signed.signedUrl, action: session.permitted_action as HandoffAction };
}

export const certificateContractV2Enabled = () => process.env.ENABLE_GFA_CERTIFICATE_CONTRACT_V2 === "true";
export const certificateContractV2 = () => ({
  schemaVersion: "1.0",
  completionEventType: "bd.learning_completion_evidence.v1",
  handoffEventType: "bd.gfa_certificate_handoff.v1",
  statusEventType: "gfa.certificate_status.v1",
  completionAudience: COMPLETION_AUDIENCE,
  handoffAudience: HANDOFF_AUDIENCE,
  statusLookupAudience: STATUS_LOOKUP_AUDIENCE,
  statusAudience: GFA_STATUS_AUDIENCE,
  incomingKeyId: CONTRACT_KEY_ID,
  outgoingKeyId: GFA_STATUS_KEY_ID,
  handoffTtlSeconds: HANDOFF_TTL_SECONDS,
});
