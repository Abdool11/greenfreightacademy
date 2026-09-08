import { NextRequest, NextResponse } from "next/server";
import {
  auditCertificateVerification,
  certificateFeatureEnabled,
  certificateVerificationEnabled,
  certificateVerificationFingerprint,
  consumeVerificationAllowance,
} from "@/lib/certificateRegistry";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function noStoreJson(body: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      ...(init?.headers ?? {}),
    },
  });
}

function normaliseCertificateNumber(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function hasValidCertificateNumberFormat(value: string) {
  return /^GFA-\d{4}-\d{8}$/.test(value);
}

export async function POST(request: NextRequest) {
  if (!certificateFeatureEnabled() || !certificateVerificationEnabled()) {
    return noStoreJson({ error: "Certificate verification is disabled for this release." }, { status: 503 });
  }

  let certificateNumber = "";
  let queryFingerprint = "";
  let requestFingerprint: string | null = null;
  try {
    const body = await request.json();
    certificateNumber = normaliseCertificateNumber(body?.certificateNumber);
    queryFingerprint = certificateVerificationFingerprint(certificateNumber || "invalid");
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    requestFingerprint = certificateVerificationFingerprint(forwardedFor || "unavailable");

    if (!hasValidCertificateNumberFormat(certificateNumber)) {
      await auditCertificateVerification(null, queryFingerprint, requestFingerprint, "invalid_request");
      return noStoreJson({ error: "Enter a valid GFA certificate number." }, { status: 400 });
    }

    if (!await consumeVerificationAllowance(requestFingerprint)) {
      await auditCertificateVerification(null, queryFingerprint, requestFingerprint, "rate_limited");
      return noStoreJson({ error: "Too many verification requests. Please wait and try again." }, { status: 429, headers: { "Retry-After": "60" } });
    }

    const { data, error } = await supabaseAdmin
      .from("certifications")
      .select("id, certificate_number, programme, issued_at, expires_at, status, courses(name)")
      .eq("certificate_number", certificateNumber)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      await auditCertificateVerification(null, queryFingerprint, requestFingerprint, "not_found");
      return noStoreJson({ verified: false, status: "not_found" }, { status: 404 });
    }

    const hasExpired = data.expires_at ? new Date(data.expires_at).getTime() < Date.now() : false;
    const status = data.status === "revoked" ? "revoked" : hasExpired || data.status === "expired" ? "expired" : "active";
    await auditCertificateVerification(data.id, queryFingerprint, requestFingerprint, status === "active" ? "verified" : status);

    return noStoreJson({
      verified: status === "active",
      status,
      certificateNumber: data.certificate_number,
      programme: (data.courses as { name?: string } | null)?.name ?? data.programme ?? "Green Freight Academy programme",
      issuedAt: data.issued_at,
      expiresAt: data.expires_at,
    });
  } catch {
    if (queryFingerprint) {
      await auditCertificateVerification(null, queryFingerprint, requestFingerprint, "invalid_request").catch(() => undefined);
    }
    return noStoreJson({ error: "Certificate verification is temporarily unavailable." }, { status: 503 });
  }
}
