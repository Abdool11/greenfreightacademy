import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validateBillingProfile } from "@/lib/quoteProfiles";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("company_billing_profiles")
    .select("*")
    .eq("company_id", session.companyId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data, complete: Boolean(data) });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { profile, errors, isValid } = validateBillingProfile(body);
  if (!isValid) {
    return NextResponse.json({ error: "Please complete the required billing details.", fields: errors }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("company_billing_profiles")
    .upsert({ ...profile, company_id: session.companyId }, { onConflict: "company_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data });
}
