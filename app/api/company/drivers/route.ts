import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// ─── Mobile validation ──────────────────────────────────────────────────────

const VALID_SA_PREFIXES = new Set([
  "60","61","62","63","64","65","66","67","68","69",
  "71","72","73","74","76","78","79","81","82","83","84",
]);

function normaliseSAMobile(raw: string): string {
  let m = raw.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  if (m.startsWith("27")) return m;
  if (m.startsWith("0")) return "27" + m.slice(1);
  return "27" + m;
}

function validateSAMobile(raw: string): { ok: true; normalised: string } | { ok: false; error: string } {
  const m = normaliseSAMobile(raw);
  if (m.length !== 11) {
    return { ok: false, error: `Mobile number must be 11 digits (got ${m.length}). Use a valid SA mobile number.` };
  }
  const prefix = m.slice(2, 4);
  if (!VALID_SA_PREFIXES.has(prefix)) {
    return { ok: false, error: `Invalid SA mobile prefix (${prefix}). Use a valid SA mobile number.` };
  }
  return { ok: true, normalised: m };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface DriverInput {
  first_name: string;
  last_name: string;
  mobile: string;
  email?: string;
  id_number?: string;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("name")
    .eq("id", session.companyId)
    .single();

  const { data: drivers, error } = await supabaseAdmin
    .from("drivers")
    .select(`
      id,
      first_name,
      last_name,
      mobile,
      alt_mobile,
      email,
      branch,
      region,
      status,
      created_at,
      enrolments(
        id,
        course_id,
        quote_id,
        campaign_id,
        status,
        progress_percent,
        progress_modules,
        link_activated,
        certified,
        nudge_sent_at,
        enrolled_at,
        completed_at,
        courses(id, name, slug, module_count, status)
      )
    `)
    .eq("company_id", session.companyId)
    .order("last_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drivers: drivers ?? [], companyName: company?.name ?? "" });
}

// ─── POST (add drivers) ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const drivers: DriverInput[] = body.drivers ?? [];

    if (!Array.isArray(drivers) || drivers.length === 0) {
      return NextResponse.json({ error: "drivers array is required" }, { status: 400 });
    }
    if (drivers.length > 50) {
      return NextResponse.json({ error: "Maximum 50 drivers per batch" }, { status: 400 });
    }

    // Fetch existing mobiles for this company to detect duplicates
    const { data: existingDrivers } = await supabaseAdmin
      .from("drivers")
      .select("mobile")
      .eq("company_id", session.companyId);

    const existingMobiles = new Set(
      (existingDrivers ?? []).map((d) => normaliseSAMobile(d.mobile ?? ""))
    );

    const created: { id: string; name: string; mobile: string }[] = [];
    const errors: { index: number; field: string; message: string }[] = [];
    const duplicates: { index: number; mobile: string }[] = [];

    for (let i = 0; i < drivers.length; i++) {
      const d = drivers[i];
      const idx = i + 1;

      if (!d.first_name?.trim()) {
        errors.push({ index: idx, field: "first_name", message: "First name is required" });
        continue;
      }
      if (!d.last_name?.trim()) {
        errors.push({ index: idx, field: "last_name", message: "Last name is required" });
        continue;
      }
      if (!d.mobile?.trim()) {
        errors.push({ index: idx, field: "mobile", message: "Mobile number is required" });
        continue;
      }

      const mobileCheck = validateSAMobile(d.mobile);
      if (!mobileCheck.ok) {
        errors.push({ index: idx, field: "mobile", message: mobileCheck.error });
        continue;
      }

      const normalisedMobile = mobileCheck.normalised;

      if (existingMobiles.has(normalisedMobile)) {
        duplicates.push({ index: idx, mobile: normalisedMobile });
        continue;
      }

      let email: string | null;
      if (d.email?.trim()) {
        if (!validateEmail(d.email.trim())) {
          errors.push({ index: idx, field: "email", message: "Invalid email address" });
          continue;
        }
        email = d.email.trim().toLowerCase();
      } else {
        email = null;
      }

      const { data, error } = await supabaseAdmin
        .from("drivers")
        .insert({
          company_id: session.companyId,
          first_name: d.first_name.trim(),
          last_name: d.last_name.trim(),
          mobile: normalisedMobile,
          email,
          status: "active",
        })
        .select("id")
        .single();

      if (error) {
        errors.push({ index: idx, field: "general", message: `Database error: ${error.message}` });
        continue;
      }

      existingMobiles.add(normalisedMobile);
      created.push({
        id: data.id,
        name: `${d.first_name.trim()} ${d.last_name.trim()}`,
        mobile: normalisedMobile,
      });
    }

    return NextResponse.json({
      ok: true,
      created: created.length,
      total: drivers.length,
      drivers: created,
      duplicates: duplicates.length,
      duplicateDetails: duplicates,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (err: any) {
    console.error("[POST /api/company/drivers] unexpected error:", err);
    return NextResponse.json({
      error: "Internal server error",
      detail: err?.message || String(err),
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { driverId } = await req.json();
  await supabaseAdmin
    .from("drivers")
    .delete()
    .eq("id", driverId)
    .eq("company_id", session.companyId);

  return NextResponse.json({ ok: true });
}
