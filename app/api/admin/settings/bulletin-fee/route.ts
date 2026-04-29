import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getAdminSession } from "@/lib/auth";

const FEE_KEY = "urgent_bulletin_fee";
const DEFAULT_FEE = 1000;

// GET /api/admin/settings/bulletin-fee
// Public — client dashboard reads this to display the fee before submitting
export async function GET() {
  const { data } = await supabaseAdmin
    .from("site_config")
    .select("value")
    .eq("key", FEE_KEY)
    .single();

  const fee = data?.value ? Number(data.value) : DEFAULT_FEE;
  return NextResponse.json({ fee });
}

// POST /api/admin/settings/bulletin-fee
// Admin only — update the urgent bulletin fee
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fee } = await req.json();
  const feeNum = Number(fee);
  if (isNaN(feeNum) || feeNum < 0) {
    return NextResponse.json({ error: "Invalid fee amount" }, { status: 400 });
  }

  await supabaseAdmin
    .from("site_config")
    .upsert(
      { key: FEE_KEY, value: String(feeNum), description: "Fee charged for urgent driver bulletins (ZAR, excl. VAT)" },
      { onConflict: "key" }
    );

  // Audit log
  supabaseAdmin.from("admin_audit_log").insert({
    admin_id: session.adminId,
    action: "bulletin_fee_update",
    target_type: "site_config",
    target_id: FEE_KEY,
    details: JSON.stringify({ fee: feeNum }),
    created_at: new Date().toISOString(),
  }).then(() => {});

  return NextResponse.json({ ok: true, fee: feeNum });
}
