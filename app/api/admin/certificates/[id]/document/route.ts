import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { certificateBucketName, certificateDocumentsEnabled } from "@/lib/certificateRegistry";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!certificateDocumentsEnabled()) return new NextResponse("Certificate documents are disabled.", { status: 503 });
  await requireAdminSession();
  const { id } = await params;
  if (!isUuid(id)) return new NextResponse("Certificate not found.", { status: 404 });

  const { data: certificate, error } = await supabaseAdmin
    .from("certifications")
    .select("id, status, document_storage_path")
    .eq("id", id)
    .in("status", ["active", "issued"])
    .maybeSingle();
  if (error || !certificate?.document_storage_path) {
    await supabaseAdmin.from("certificate_document_access_events").insert({ certificate_id: id, audience: "gfa_admin", outcome: "unavailable" });
    return new NextResponse("Certificate document is unavailable.", { status: 404 });
  }

  const { data: signed, error: signedError } = await supabaseAdmin.storage
    .from(certificateBucketName())
    .createSignedUrl(certificate.document_storage_path, 60, { download: true });
  if (signedError || !signed?.signedUrl) {
    await supabaseAdmin.from("certificate_document_access_events").insert({ certificate_id: certificate.id, audience: "gfa_admin", outcome: "unavailable" });
    return new NextResponse("Certificate document is unavailable.", { status: 503 });
  }

  await supabaseAdmin.from("certificate_document_access_events").insert({ certificate_id: certificate.id, audience: "gfa_admin", outcome: "granted" });
  return NextResponse.redirect(signed.signedUrl, {
    headers: { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" },
  });
}
