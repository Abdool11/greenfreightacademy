import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { certificateContractV2Enabled } from "@/lib/certificateContractV2";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function isOpaque(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,180}$/.test(value);
}

function isVersion(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._-]{1,48}$/.test(value);
}

export async function POST(request: NextRequest) {
  if (!certificateContractV2Enabled()) {
    return NextResponse.json({ error: "GFA certificate contract Version 2 is disabled for this release." }, { status: 503 });
  }
  await requireAdminSession();

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid mapping request." }, { status: 400 });
  }

  const { driverId, companyId, enrolmentId, driverRef, companyRef, enrolmentRef, programmeCode, programmeVersion } = body;
  if (!isUuid(driverId) || !isUuid(companyId) || !isUuid(enrolmentId) || !isOpaque(driverRef) || !isOpaque(companyRef) || !isOpaque(enrolmentRef) || !isVersion(programmeCode) || !isVersion(programmeVersion)) {
    return NextResponse.json({ error: "Mapping identifiers are incomplete or invalid." }, { status: 400 });
  }

  const { data: enrolment, error: enrolmentError } = await supabaseAdmin
    .from("enrolments")
    .select("id")
    .eq("id", enrolmentId)
    .eq("driver_id", driverId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (enrolmentError || !enrolment) return NextResponse.json({ error: "The GFA driver, company and enrolment do not form an approved mapping." }, { status: 409 });

  const { data, error } = await supabaseAdmin
    .from("certificate_external_mappings")
    .upsert({
      external_system: "betterdriver",
      external_driver_ref: driverRef,
      external_company_ref: companyRef,
      external_enrolment_ref: enrolmentRef,
      driver_id: driverId,
      company_id: companyId,
      enrolment_id: enrolmentId,
      programme_code: programmeCode,
      programme_version: programmeVersion,
      deactivated_at: null,
    }, { onConflict: "external_system,external_enrolment_ref" })
    .select("id")
    .single();
  if (error || !data) return NextResponse.json({ error: "The approved opaque mapping could not be saved." }, { status: 409 });

  return NextResponse.json({ ok: true, mappingId: data.id }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
