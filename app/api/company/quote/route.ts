import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

interface QuoteLineItem {
  driverId: string;
  driverName: string;
  driverMobile?: string;
  courseIds: string[];
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items }: { items: QuoteLineItem[] } = await req.json();
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  // Fetch course pricing from site_config
  const config = await getConfigs([
    "email_booking_to",
    "company_name",
    "company_vat_number",
    "company_address",
    "company_phone",
    "company_email",
    "company_bank_name",
    "company_bank_account",
    "company_bank_branch",
    "company_bank_account_holder",
    "company_bank_account_type",
    "company_bank_product_type",
  ]);

  // Fetch course prices from DB
  const allCourseIds = [...new Set(items.flatMap(i => i.courseIds))];
  const { data: courses } = await supabaseAdmin
    .from("courses")
    .select("id, name, price_corporate")
    .in("id", allCourseIds);

  const courseMap = Object.fromEntries((courses ?? []).map(c => [c.id, c]));

  // Fetch driver mobile numbers
  const driverIds = items.map(i => i.driverId);
  const { data: driversData } = await supabaseAdmin
    .from("drivers")
    .select("id, mobile")
    .in("id", driverIds);
  const driverMobileMap = Object.fromEntries((driversData ?? []).map(d => [d.id, d.mobile]));

  // Build line items
  const lineItems = items.flatMap(item =>
    item.courseIds.map(courseId => ({
      driverName: item.driverName,
      driverMobile: driverMobileMap[item.driverId] ?? "",
      courseName: courseMap[courseId]?.name ?? courseId,
      price: courseMap[courseId]?.price_corporate ?? 0,
    }))
  );

  const subtotal = lineItems.reduce((sum, l) => sum + l.price, 0);
  const vat = Math.round(subtotal * 0.15 * 100) / 100;
  const total = subtotal + vat;

  // Generate reference number
  const ref = `GFA-${Date.now().toString(36).toUpperCase()}`;

  // Save quote to DB
  const { data: quote, error } = await supabaseAdmin
    .from("quotes")
    .insert({
      company_id: session.companyId,
      reference: ref,
      line_items: lineItems,
      subtotal,
      vat,
      total,
      status: "pending",
      items_json: items,
    })
    .select()
    .single();

  if (error) {
    console.error("Quote save error:", error);
    return NextResponse.json({ error: "Failed to save quote" }, { status: 500 });
  }

  // Build email HTML
  const lineItemsHtml = lineItems.map(l => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${l.driverName}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${l.courseName}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">R ${l.price.toFixed(2)}</td>
    </tr>
  `).join("");

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 700px; margin: 0 auto; color: #111827;">
      <div style="background: #0f1f3d; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 1.25rem;">GreenFreightAcademy</h1>
        <p style="color: #93c5fd; margin: 4px 0 0; font-size: 0.875rem;">Training Quotation</p>
      </div>
      <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
          <div>
            <p style="margin: 0; font-weight: 600; font-size: 1rem;">${config.company_name || "GreenFreightAcademy"}</p>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 0.875rem;">VAT: ${config.company_vat_number || "TBC"}</p>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 0.875rem;">${config.company_address || ""}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-weight: 700; font-size: 1.125rem; color: #1d4ed8;">QUOTATION</p>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 0.875rem;">Ref: <strong>${ref}</strong></p>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 0.875rem;">${new Date().toLocaleDateString("en-ZA")}</p>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <p style="margin: 0; font-weight: 600;">Bill to:</p>
          <p style="margin: 4px 0 0; color: #374151;">${session.companyName}</p>
          <p style="margin: 2px 0 0; color: #6b7280; font-size: 0.875rem;">${session.email}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px 12px; text-align: left; font-size: 0.8125rem; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Driver</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 0.8125rem; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Programme</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 0.8125rem; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Amount</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 8px 12px; text-align: right; color: #6b7280;">Subtotal</td>
              <td style="padding: 8px 12px; text-align: right;">R ${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 8px 12px; text-align: right; color: #6b7280;">VAT (15%)</td>
              <td style="padding: 8px 12px; text-align: right;">R ${vat.toFixed(2)}</td>
            </tr>
            <tr style="background: #f0fdf4;">
              <td colspan="2" style="padding: 10px 12px; text-align: right; font-weight: 700;">TOTAL</td>
              <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #16a34a;">R ${total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-weight: 600; font-size: 0.875rem;">Payment Details (EFT)</p>
          <p style="margin: 0; color: #374151; font-size: 0.875rem;">Bank: <strong>${config.company_bank_name || "TBC"}</strong></p>
          <p style="margin: 4px 0 0; color: #374151; font-size: 0.875rem;">Account Holder: ${config.company_bank_account_holder || "TBC"}</p>
          <p style="margin: 4px 0 0; color: #374151; font-size: 0.875rem;">Account Number: <strong>${config.company_bank_account || "TBC"}</strong></p>
          <p style="margin: 4px 0 0; color: #374151; font-size: 0.875rem;">Account Type: ${config.company_bank_account_type || "TBC"}</p>
          <p style="margin: 4px 0 0; color: #374151; font-size: 0.875rem;">Branch Code: ${config.company_bank_branch || "TBC"}</p>
          <p style="margin: 4px 0 0; color: #374151; font-size: 0.875rem;">Product Type: ${config.company_bank_product_type || "TBC"}</p>
          <p style="margin: 8px 0 0; color: #374151; font-size: 0.875rem;">Reference: <strong>${ref}</strong></p>
        </div>

        <p style="color: #6b7280; font-size: 0.8125rem;">
          You can pay online via card — just click <strong>"Pay Now"</strong> on your dashboard. Alternatively, pay via EFT using the bank details above and email your proof of payment to ${config.company_email || "info@greenfreightacademy.com"}. Once your payment is verified, return to your dashboard and click <strong>"Deploy Training"</strong> to send WhatsApp welcome messages to your drivers.
        </p>
        <p style="color: #6b7280; font-size: 0.8125rem; margin-top: 8px;">
          Questions? Contact us at ${config.company_email || "info@greenfreightacademy.com"} or ${config.company_phone || ""}
        </p>
      </div>
    </div>
  `;

  // Send quote email to company
  if (process.env.BREVO_SMTP_PASSWORD) {
    try {
      await sendEmail({
        from: "abdool@transportactiongroup.co.za",
        fromName: "GreenFreightAcademy",
        to: session.email,
        subject: `Your GFA Training Quotation — ${ref}`,
        html: emailHtml,
      });

      // Also notify GFA admin
      const adminEmail = config.email_booking_to || "durbanroadtransport@gmail.com";
      await sendEmail({
        from: "abdool@transportactiongroup.co.za",
        fromName: "GFA Platform",
        to: adminEmail,
        subject: `New quote generated — ${session.companyName} — ${ref}`,
        html: `<p>A new quote has been generated for <strong>${session.companyName}</strong>.</p><p>Reference: <strong>${ref}</strong></p><p>Total: <strong>R ${total.toFixed(2)}</strong></p><p>Drivers: ${items.length}</p>`,
      });
    } catch (emailErr) {
      console.error("Quote email send error:", emailErr);
    }
  } else {
    console.warn("BREVO_SMTP_PASSWORD not set — quote email skipped for", ref);
  }

  return NextResponse.json({ ok: true, reference: ref, total, quoteId: quote.id });
}
