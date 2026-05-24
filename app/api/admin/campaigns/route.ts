import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { Resend } from "resend";
import crypto from "crypto";

// POST /api/admin/campaigns — send bulk voucher campaign to selected leads
export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const {
    leadIds,
    seats,
    expiresDays,
    welcomeMessage,
    brochureUrl,
    sendVia, // "email" | "whatsapp" | "both"
  } = await req.json();

  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: "leadIds array required" }, { status: 400 });
  }

  if (!seats || ![1, 3, 5, 10].includes(Number(seats))) {
    return NextResponse.json({ error: "seats must be 1, 3, 5, or 10" }, { status: 400 });
  }

  // Fetch leads
  const { data: leads } = await supabaseAdmin
    .from("prospect_leads")
    .select("id, company_name, contact_name, email, phone, stage")
    .in("id", leadIds);

  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: "No leads found" }, { status: 404 });
  }

  const config = await getConfigs(["whatsapp_phone_id", "whatsapp_access_token"]);
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  const results: { leadId: string; code: string; sent: boolean; error?: string }[] = [];

  for (const lead of leads) {
    try {
      // Generate unique voucher code per lead
      const code = `TRIAL-GFA-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (Number(expiresDays) || 30));

      // Create voucher
      const { data: voucher, error: voucherError } = await supabaseAdmin
        .from("trial_vouchers")
        .insert({
          code,
          seats: Number(seats),
          expires_days: Number(expiresDays) || 30,
          expires_at: expiresAt.toISOString(),
          welcome_message: welcomeMessage ?? null,
          brochure_url: brochureUrl ?? null,
          prospect_name: lead.contact_name,
          prospect_email: lead.email,
          prospect_phone: lead.phone,
          prospect_company: lead.company_name,
          status: "pending",
          created_by: session.adminId,
          created_by_name: session.name,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (voucherError || !voucher) {
        results.push({ leadId: lead.id, code, sent: false, error: "Voucher creation failed" });
        continue;
      }

      // Link voucher to lead
      await supabaseAdmin
        .from("prospect_leads")
        .update({
          voucher_id: voucher.id,
          stage: "voucher_sent",
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", lead.id);

      const activationUrl = `${process.env.NEXT_PUBLIC_GFA_URL ?? ""}/trial?code=${code}`;
      let sent = false;

      // Send email
      if ((sendVia === "email" || sendVia === "both") && lead.email && resend) {
        try {
          await resend.emails.send({
            from: "GreenFreightAcademy <noreply@greenfreightacademy.co.za>",
            to: lead.email,
            subject: `Your GFA Trial Access — ${seats} seat${Number(seats) > 1 ? "s" : ""} ready`,
            html: buildCampaignEmail({
              prospectName: lead.contact_name ?? "there",
              prospectCompany: lead.company_name ?? "",
              seats: Number(seats),
              welcomeMessage: welcomeMessage ?? "",
              brochureUrl: brochureUrl ?? "",
              activationUrl,
              expiresAt: expiresAt.toLocaleDateString("en-ZA"),
              code,
            }),
          });
          sent = true;
        } catch (emailErr) {
          console.error(`Email error for lead ${lead.id}:`, emailErr);
        }
      }

      // Send WhatsApp
      if ((sendVia === "whatsapp" || sendVia === "both") && lead.phone && config.whatsapp_phone_id && config.whatsapp_access_token) {
        try {
          const waRes = await fetch(
            `https://graph.facebook.com/v18.0/${config.whatsapp_phone_id}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${config.whatsapp_access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: lead.phone.replace(/\D/g, ""),
                type: "text",
                text: {
                  body: `Hi ${lead.contact_name ?? "there"} 👋\n\nYou have been invited to trial the GreenFreightAcademy platform with ${seats} driver seat${Number(seats) > 1 ? "s" : ""}.\n\n${welcomeMessage ? welcomeMessage + "\n\n" : ""}Activate your trial here:\n${activationUrl}\n\nYour trial code: *${code}*\nExpires: ${expiresAt.toLocaleDateString("en-ZA")}`,
                },
              }),
            }
          );
          if (waRes.ok) sent = true;
        } catch (waErr) {
          console.error(`WhatsApp error for lead ${lead.id}:`, waErr);
        }
      }

      // Update voucher status
      await supabaseAdmin
        .from("trial_vouchers")
        .update({ status: sent ? "sent" : "pending", sent_at: sent ? new Date().toISOString() : null })
        .eq("id", voucher.id);

      results.push({ leadId: lead.id, code, sent });
    } catch (err) {
      console.error(`Campaign error for lead ${lead.id}:`, err);
      results.push({ leadId: lead.id, code: "", sent: false, error: "Unexpected error" });
    }
  }

  const sentCount = results.filter((r) => r.sent).length;

  // Log campaign
  await supabaseAdmin.from("campaign_logs").insert({
    created_by: session.adminId,
    lead_count: leads.length,
    sent_count: sentCount,
    seats,
    expires_days: expiresDays ?? 30,
    send_via: sendVia,
    created_at: new Date().toISOString(),
  }).then(() => {});

  return NextResponse.json({
    ok: true,
    total: leads.length,
    sent: sentCount,
    failed: leads.length - sentCount,
    results,
  });
}

// GET /api/admin/campaigns — list campaign logs
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { data: campaigns } = await supabaseAdmin
    .from("campaign_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ campaigns: campaigns ?? [] });
}

function buildCampaignEmail(params: {
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
