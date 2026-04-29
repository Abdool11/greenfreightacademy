import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quoteId } = await req.json();
  if (!quoteId) return NextResponse.json({ error: "quoteId required" }, { status: 400 });

  // Verify quote is paid
  const { data: quote } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("company_id", session.companyId)
    .single();

  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (quote.status !== "paid") {
    return NextResponse.json({ error: "Payment must be confirmed before deploying" }, { status: 400 });
  }
  if (quote.deployed_at) {
    return NextResponse.json({ ok: true, alreadyDeployed: true });
  }

  const config = await getConfigs([
    "whatsapp_phone_id",
    "whatsapp_access_token",
    "whatsapp_welcome_template",
    "email_booking_to",
    "company_name",
  ]);

  const items: Array<{ driverId: string; driverName: string; courseIds: string[] }> = quote.items_json ?? [];
  const results: { driverId: string; whatsapp: boolean; enrolment: boolean }[] = [];

  for (const item of items) {
    // Fetch driver mobile
    const { data: driver } = await supabaseAdmin
      .from("drivers")
      .select("id, first_name, last_name, mobile")
      .eq("id", item.driverId)
      .single();

    if (!driver) continue;

    // Create enrolment records
    for (const courseId of item.courseIds) {
      await supabaseAdmin.from("enrolments").upsert({
        driver_id: driver.id,
        company_id: session.companyId,
        course_id: courseId,
        quote_id: quoteId,
        status: "enrolled",
        enrolled_at: new Date().toISOString(),
        progress_percent: 0,
      }, { onConflict: "driver_id,course_id", ignoreDuplicates: true });
    }

    // Send WhatsApp welcome message
    let whatsappSent = false;
    const phoneId = config.whatsapp_phone_id;
    const accessToken = config.whatsapp_access_token;

    if (phoneId && accessToken && driver.mobile) {
      // Normalise SA mobile number to international format
      let mobile = driver.mobile.replace(/\s+/g, "").replace(/^0/, "27");
      if (!mobile.startsWith("27")) mobile = `27${mobile}`;

      const welcomeMessage = (config.whatsapp_welcome_template || 
        `Hi {{name}}, welcome to GreenFreightAcademy! Your training has been activated. You will receive your course access details shortly. Your development journey starts now. 🚛`)
        .replace("{{name}}", driver.first_name)
        .replace("{{company}}", session.companyName);

      try {
        const waRes = await fetch(
          `https://graph.facebook.com/v18.0/${phoneId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: mobile,
              type: "text",
              text: { body: welcomeMessage },
            }),
          }
        );
        whatsappSent = waRes.ok;
      } catch (e) {
        console.error("WhatsApp send error:", e);
      }
    }

    results.push({ driverId: driver.id, whatsapp: whatsappSent, enrolment: true });
  }

  // Mark quote as deployed
  await supabaseAdmin
    .from("quotes")
    .update({ status: "deployed", deployed_at: new Date().toISOString() })
    .eq("id", quoteId);

  // Notify GFA admin
  const adminEmail = config.email_booking_to || "durbanroadtransport@gmail.com";
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `GreenFreightAcademy <notifications@greenfreightacademy.com>`,
      to: adminEmail,
      subject: `Training deployed — ${session.companyName} — Ref: ${quote.reference}`,
      html: `
        <p><strong>${session.companyName}</strong> has confirmed payment and deployed training.</p>
        <p>Quote reference: <strong>${quote.reference}</strong></p>
        <p>Drivers enrolled: <strong>${items.length}</strong></p>
        <p>WhatsApp messages sent: <strong>${results.filter(r => r.whatsapp).length}</strong></p>
        <p>Total value: <strong>R ${quote.total?.toFixed(2)}</strong></p>
      `,
    });
  }

  return NextResponse.json({
    ok: true,
    deployed: results.length,
    whatsappSent: results.filter(r => r.whatsapp).length,
  });
}
