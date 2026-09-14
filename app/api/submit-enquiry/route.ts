import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type EnquiryType = "fleet-company" | "individual-learner" | "partnership" | "general";

const ENQUIRY_TYPES: ReadonlySet<EnquiryType> = new Set([
  "fleet-company",
  "individual-learner",
  "partnership",
  "general",
]);

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normaliseNewlines(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Please complete the enquiry form and try again." }, { status: 400 });
  }

  const type = cleanText(body.type, 40) as EnquiryType;
  const organisationName = cleanText(body.organisationName, 160);
  const organisationRole = cleanText(body.organisationRole, 120);
  const name = cleanText(body.name, 160);
  const email = cleanText(body.email, 254).toLowerCase();
  const mobile = cleanText(body.mobile, 48);
  const fleetSize = cleanText(body.fleetSize, 80);
  const message = normaliseNewlines(cleanText(body.message, 4000));

  if (!ENQUIRY_TYPES.has(type) || !organisationName || !organisationRole || !name || !validEmail(email) || !mobile) {
    return NextResponse.json({ error: "Please provide the required enquiry details." }, { status: 400 });
  }

  const notes = [
    `Enquiry type: ${type}`,
    `Organisation role: ${organisationRole}`,
    fleetSize ? `Fleet size: ${fleetSize}` : null,
    message ? `Message:\n${message}` : null,
  ].filter(Boolean).join("\n\n");

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("prospect_leads")
    .insert({
      company_name: organisationName,
      contact_name: name,
      email,
      phone: mobile,
      notes,
      stage: "new",
      source: "gfa_contact_form",
      created_at: now,
      last_activity_at: now,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[submit-enquiry] unable to save enquiry", error?.message);
    return NextResponse.json({ error: "We could not save your enquiry. Please try again shortly." }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}
