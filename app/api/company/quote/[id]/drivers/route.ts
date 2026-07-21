import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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
  if (m.length !== 11) return { ok: false, error: `Mobile must be 11 digits (got ${m.length})` };
  const prefix = m.slice(2, 4);
  if (!VALID_SA_PREFIXES.has(prefix)) return { ok: false, error: `Invalid SA prefix (${prefix})` };
  return { ok: true, normalised: m };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface DriverDetail {
  first_name: string;
  last_name: string;
  mobile: string;
  email?: string;
  selected: boolean;
}

// PATCH /api/company/quote/[id]/drivers — save driver details against a paid quote
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quoteId = params.id;
  const { drivers: driverDetails } = await req.json() as { drivers: DriverDetail[] };

  if (!Array.isArray(driverDetails) || driverDetails.length === 0) {
    return NextResponse.json({ error: "drivers array is required" }, { status: 400 });
  }

  // Verify quote belongs to company and is paid/approved
  const { data: quote } = await supabaseAdmin
    .from("quotes")
    .select("id, status, items_json, line_items")
    .eq("id", quoteId)
    .eq("company_id", session.companyId)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  if (quote.status !== "paid" && quote.status !== "approved") {
    return NextResponse.json({ error: "Quote must be paid before adding driver details" }, { status: 400 });
  }

  // Only process selected drivers
  const selectedDrivers = driverDetails.filter(d => d.selected);
  if (selectedDrivers.length === 0) {
    return NextResponse.json({ error: "Please select at least one driver to deploy" }, { status: 400 });
  }

  // Fetch existing mobiles for duplicate detection
  const { data: existingDrivers } = await supabaseAdmin
    .from("drivers")
    .select("id, mobile")
    .eq("company_id", session.companyId);

  const existingMobileMap = new Map<string, string>();
  (existingDrivers ?? []).forEach(d => {
    existingMobileMap.set(normaliseSAMobile(d.mobile ?? ""), d.id);
  });

  const itemsJson: Array<{ driverId: string; driverName: string; courseIds: string[] }> =
    quote.items_json ?? [];

  // Extract courseIds from the first item (all items in a simple quote share the same course)
  const courseIds = itemsJson.length > 0 ? itemsJson[0].courseIds : [];

  const errors: { index: number; field: string; message: string }[] = [];
  const createdDrivers: { id: string; name: string; mobile: string }[] = [];
  const newItemsJson: Array<{ driverId: string; driverName: string; courseIds: string[] }> = [];

  for (let i = 0; i < selectedDrivers.length; i++) {
    const d = selectedDrivers[i];
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

    let email: string;
    if (d.email?.trim()) {
      if (!validateEmail(d.email.trim())) {
        errors.push({ index: idx, field: "email", message: "Invalid email address" });
        continue;
      }
      email = d.email.trim().toLowerCase();
    } else {
      email = `driver_${session.companyId}_${normalisedMobile}@placeholder.local`;
    }

    // Check if driver already exists (by mobile)
    let driverId: string | undefined = existingMobileMap.get(normalisedMobile);

    if (!driverId) {
      const { data: newDriver, error: insertErr } = await supabaseAdmin
        .from("drivers")
        .insert({
          company_id: session.companyId,
          first_name: d.first_name.trim(),
          last_name: d.last_name.trim(),
          mobile: normalisedMobile,
          email,
          activation_status: "invited",
          status: "active",
        })
        .select("id")
        .single();

      if (insertErr || !newDriver) {
        errors.push({ index: idx, field: "general", message: `Database error: ${insertErr?.message ?? "unknown"}` });
        continue;
      }

      driverId = newDriver.id;
      existingMobileMap.set(normalisedMobile, driverId!);
    }

    if (!driverId) continue; // safety guard

    createdDrivers.push({
      id: driverId,
      name: `${d.first_name.trim()} ${d.last_name.trim()}`,
      mobile: normalisedMobile,
    });

    newItemsJson.push({
      driverId,
      driverName: `${d.first_name.trim()} ${d.last_name.trim()}`,
      courseIds,
    });
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation errors", errorDetails: errors }, { status: 400 });
  }

  // Build new line_items from the original line_items template
  const originalLineItems: Array<{ driverName: string; driverMobile?: string; courseName: string; price: number }> =
    quote.line_items ?? [];

  // Get course name and price from the first original line item
  const courseName = originalLineItems[0]?.courseName ?? "";
  const price = originalLineItems[0]?.price ?? 0;

  const newLineItems = createdDrivers.flatMap(d =>
    courseIds.map(() => ({
      driverName: d.name,
      driverMobile: d.mobile,
      courseName,
      price,
    }))
  );

  // Update the quote with real driver data
  const { error: updateErr } = await supabaseAdmin
    .from("quotes")
    .update({
      items_json: newItemsJson,
      line_items: newLineItems,
    })
    .eq("id", quoteId)
    .eq("company_id", session.companyId);

  if (updateErr) {
    console.error("[quote/drivers] update error:", updateErr);
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    driversCreated: createdDrivers.length,
    drivers: createdDrivers,
  });
}
