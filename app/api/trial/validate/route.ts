import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/trial/validate?code=TRIAL-GFA-XXXX
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ valid: false, error: "No voucher code provided" }, { status: 400 });
  }

  const { data: voucher } = await supabaseAdmin
    .from("trial_vouchers")
    .select("id, code, seats, expires_at, welcome_message, brochure_url, prospect_name, prospect_email, prospect_company, status")
    .eq("code", code.toUpperCase())
    .single();

  if (!voucher) {
    return NextResponse.json({ valid: false, error: "Invalid voucher code. Please check your invitation link." }, { status: 404 });
  }

  if (voucher.status === "activated" || voucher.status === "converted") {
    return NextResponse.json({ valid: false, error: "This voucher has already been activated. If you have already registered, please log in." }, { status: 409 });
  }

  if (voucher.status === "expired" || new Date(voucher.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: "This trial invitation has expired. Please contact GreenFreightAcademy for a new invitation." }, { status: 410 });
  }

  return NextResponse.json({
    valid: true,
    code: voucher.code,
    seats: voucher.seats,
    expiresAt: voucher.expires_at,
    welcomeMessage: voucher.welcome_message,
    brochureUrl: voucher.brochure_url,
    prospectName: voucher.prospect_name,
    prospectEmail: voucher.prospect_email,
    prospectCompany: voucher.prospect_company,
  });
}
