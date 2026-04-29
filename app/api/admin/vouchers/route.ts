import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { Resend } from "resend";
import crypto from "crypto";

// GET /api/admin/vouchers — list all vouchers
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { data: vouchers, error } = await supabaseAdmin
    .from("trial_vouchers")
    .select(`
      id, code, seats, expires_days, welcome_message, brochure_url,
      status, created_at, activated_at, notes,
      prospect_name, prospect_email, prospect_phone, prospect_company,
      created_by_name,
      companies(id, name, account_type)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch vouchers" }, { status: 500 });
  }

  return NextResponse.json({ vouchers: vouchers ?? [] });
}

// POST /api/admin/vouchers — create a new voucher
export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const {
    seats,
    expiresDays,
    welcomeMessage,
    brochureUrl,
    notes,
    prospectName,
    prospectEmail,
    prospectPhone,
    prospectCompany,
    sendVia, // "email" | "whatsapp" | "both" | "none"
  } = await req.json();

  if (!seats || ![1, 3, 5, 10].includes(Number(seats))) {
    return NextResponse.json({ error: "seats must be 1, 3, 5, or 10" }, { status: 400 });
  }

  // Generate unique voucher code
  const code = `TRIAL-GFA-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (Number(expiresDays) || 30));

  const { data: voucher, error } = await supabaseAdmin
    .from("trial_vouchers")
    .insert({
      code,
      seats: Number(seats),
      expires_days: Number(expiresDays) || 30,
      expires_at: expiresAt.toISOString(),
      welcome_message: welcomeMessage ?? null,
      brochure_url: brochureUrl ?? null,
      notes: notes ?? null,
      prospect_name: prospectName ?? null,
      prospect_email: prospectEmail ?? null,
      prospect_phone: prospectPhone ?? null,
      prospect_company: prospectCompany ?? null,
      status: "pending",
      created_by: session.adminId,
      created_by_name: session.name,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !voucher) {
    console.error("Voucher create error:", error);
    return NextResponse.json({ error: "Failed to create voucher" }, { status: 500 });
  }

  const activationUrl = `${process.env.NEXT_PUBLIC_GFA_URL ?? ""}/trial?code=${code}`;

  // Send via email
  if ((sendVia === "email" || sendVia === "both") && prospectEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "GreenFreightAcademy <noreply@greenfreightacademy.co.za>",
        to: prospectEmail,
        subject: `Your GFA Trial Access — ${seats} seat${seats > 1 ? "s" : ""} ready`,
        html: buildVoucherEmail({
          prospectName: prospectName ?? "there",
          prospectCompany: prospectCompany ?? "",
          seats: Number(seats),
          welcomeMessage: welcomeMessage ?? "",
          brochureUrl: brochureUrl ?? "",
          activationUrl,
          expiresAt: expiresAt.toLocaleDateString("en-ZA"),
          code,
        }),
      });
    } catch (emailErr) {
      console.error("Voucher email error:", emailErr);
    }
  }

  // Send via WhatsApp
  if ((sendVia === "whatsapp" || sendVia === "both") && prospectPhone) {
    const config = await getConfigs(["whatsapp_phone_id", "whatsapp_access_token"]);
    if (config.whatsapp_phone_id && config.whatsapp_access_token) {
      try {
        await fetch(
          `https://graph.facebook.com/v18.0/${config.whatsapp_phone_id}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.whatsapp_access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: prospectPhone.replace(/\D/g, ""),
              type: "text",
              text: {
                body: `Hi ${prospectName ?? "there"} 👋\n\nYou have been invited to trial the GreenFreightAcademy platform with ${seats} driver seat${seats > 1 ? "s" : ""}.\n\n${welcomeMessage ? welcomeMessage + "\n\n" : ""}Activate your trial here:\n${activationUrl}\n\nYour trial code: *${code}*\nExpires: ${expiresAt.toLocaleDateString("en-ZA")}`,
              },
            }),
          }
        );
      } catch (waErr) {
        console.error("WhatsApp voucher error:", waErr);
      }
    }
  }

  // Update voucher status to "sent" if dispatched
  if (sendVia && sendVia !== "none") {
    await supabaseAdmin
      .from("trial_vouchers")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", voucher.id);
  }

  return NextResponse.json({ ok: true, voucher: { ...voucher, activation_url: activationUrl } });
}

// PATCH /api/admin/vouchers — convert trial to full account
export async function PATCH(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { voucherId, action } = await req.json();

  if (action === "convert_to_full") {
    const { data: voucher } = await supabaseAdmin
      .from("trial_vouchers")
      .select("company_id, status")
      .eq("id", voucherId)
      .single();

    if (!voucher?.company_id) {
      return NextResponse.json({ error: "Voucher not activated or company not found" }, { status: 404 });
    }

    await supabaseAdmin
      .from("companies")
      .update({ account_type: "full", trial_expires_at: null })
      .eq("id", voucher.company_id);

    await supabaseAdmin
      .from("trial_vouchers")
      .update({ status: "converted", converted_at: new Date().toISOString(), converted_by: session.adminId })
      .eq("id", voucherId);

    return NextResponse.json({ ok: true });
  }

  if (action === "extend") {
    const { extendDays } = await req.json();
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + Number(extendDays || 14));

    await supabaseAdmin
      .from("trial_vouchers")
      .update({ expires_at: newExpiry.toISOString() })
      .eq("id", voucherId);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

function buildVoucherEmail(params: {
  prospectName: string;
  prospectCompany: string;
  seats: number;
  welcomeMessage: string;
  brochureUrl: string;
  activationUrl: string;
  expiresAt: string;
  code: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #060e1a; color: #f9fafb; padding: 2rem; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <div style="font-size: 1.5rem; font-weight: 700; color: #22c55e;">GreenFreightAcademy</div>
        <div style="color: #6b7280; font-size: 0.875rem;">South Africa's road freight capability platform</div>
      </div>
      <h2 style="color: #f9fafb; margin-bottom: 0.5rem;">Your trial access is ready, ${params.prospectName}</h2>
      ${params.prospectCompany ? `<p style="color: #9ca3af; margin-bottom: 1rem;">We have set up a trial account for <strong style="color: #f9fafb;">${params.prospectCompany}</strong>.</p>` : ""}
      ${params.welcomeMessage ? `<div style="background: #0a1628; border-left: 3px solid #22c55e; padding: 1rem 1.25rem; border-radius: 0 8px 8px 0; margin-bottom: 1.5rem; color: #d1fae5; font-style: italic;">${params.welcomeMessage}</div>` : ""}
      <div style="background: #0a1628; border: 1px solid rgba(34,197,94,0.3); border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; text-align: center;">
        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Your trial includes</div>
        <div style="font-size: 2rem; font-weight: 700; color: #22c55e;">${params.seats} driver seat${params.seats > 1 ? "s" : ""}</div>
        <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">Expires: ${params.expiresAt}</div>
      </div>
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <a href="${params.activationUrl}" style="display: inline-block; padding: 0.875rem 2rem; background: #22c55e; color: #000; font-weight: 700; text-decoration: none; border-radius: 8px; font-size: 1rem;">Activate your trial →</a>
      </div>
      <div style="background: #0a1628; border-radius: 8px; padding: 0.875rem 1rem; margin-bottom: 1.5rem; text-align: center;">
        <div style="font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem;">Your trial code</div>
        <div style="font-size: 1.125rem; font-weight: 700; color: #f9fafb; letter-spacing: 0.05em;">${params.code}</div>
      </div>
      ${params.brochureUrl ? `<div style="text-align: center; margin-bottom: 1.5rem;"><a href="${params.brochureUrl}" style="color: #22c55e; text-decoration: none; font-size: 0.875rem;">📄 Download training brochure</a></div>` : ""}
      <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 1rem; text-align: center; color: #4b5563; font-size: 0.75rem;">
        GreenFreightAcademy · South Africa's specialist capability platform for the road freight sector
      </div>
    </div>
  `;
}
