import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { adminNotify, writeLedgerEntry } from "@/lib/adminNotify";
import { asBillingSnapshot, getQuoteValidUntil, getSupplierProfile } from "@/lib/quoteProfiles";

interface QuoteLineItem {
  driverId: string;
  driverName: string;
  driverMobile?: string;
  courseIds: string[];
}

interface QuoteRequest {
  items: QuoteLineItem[];
  purchaseOrderRef?: string;
  costCentre?: string;
}

const html = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const formatZar = (amount: number) => `R ${amount.toFixed(2)}`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items, purchaseOrderRef, costCentre }: QuoteRequest = await req.json();
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  // A formal quote needs a buyer. The current profile is copied into a snapshot
  // so historic quotes remain unchanged when a company updates its details later.
  const { data: billingProfile, error: billingError } = await supabaseAdmin
    .from("company_billing_profiles")
    .select("*")
    .eq("company_id", session.companyId)
    .maybeSingle();

  if (billingError) {
    console.error("Billing profile lookup error:", billingError);
    return NextResponse.json({ error: "Could not load billing details" }, { status: 500 });
  }
  if (!billingProfile) {
    return NextResponse.json({
      error: "Complete your Billing Profile before requesting a formal quote.",
      code: "billing_profile_required",
      redirectTo: "/dashboard/billing",
    }, { status: 409 });
  }

  const [supplier, config] = await Promise.all([
    getSupplierProfile(),
    getConfigs(["email_booking_to"]),
  ]);

  const allCourseIds = [...new Set(items.flatMap((item) => item.courseIds))];
  const { data: courses, error: coursesError } = await supabaseAdmin
    .from("courses")
    .select("id, name, price_corporate")
    .in("id", allCourseIds);

  if (coursesError) return NextResponse.json({ error: "Could not load programme pricing" }, { status: 500 });
  const courseMap = Object.fromEntries((courses ?? []).map((course) => [course.id, course]));
  if (allCourseIds.some((courseId) => !courseMap[courseId])) {
    return NextResponse.json({ error: "One or more selected programmes are unavailable. Please refresh and try again." }, { status: 400 });
  }

  const driverIds = items.map((item) => item.driverId);
  const { data: driversData } = await supabaseAdmin
    .from("drivers")
    .select("id, mobile")
    .in("id", driverIds)
    .eq("company_id", session.companyId);
  const driverMobileMap = Object.fromEntries((driversData ?? []).map((driver) => [driver.id, driver.mobile]));

  const lineItems = items.flatMap((item) => item.courseIds.map((courseId) => ({
    driverName: item.driverName,
    driverMobile: driverMobileMap[item.driverId] ?? "",
    courseName: courseMap[courseId]?.name ?? courseId,
    price: Number(courseMap[courseId]?.price_corporate ?? 0),
  })));

  const subtotal = lineItems.reduce((sum, line) => sum + line.price, 0);
  const vat = Math.round(subtotal * 0.15 * 100) / 100;
  const total = subtotal + vat;
  const reference = `GFA-${Date.now().toString(36).toUpperCase()}`;
  const validUntil = getQuoteValidUntil(supplier.quote_validity_days);
  const billingSnapshot = asBillingSnapshot(billingProfile);

  const { data: quote, error: quoteError } = await supabaseAdmin
    .from("quotes")
    .insert({
      company_id: session.companyId,
      reference,
      line_items: lineItems,
      subtotal,
      vat,
      total,
      status: "pending",
      items_json: items,
      quote_version: 1,
      valid_until: validUntil,
      billing_profile_snapshot: billingSnapshot,
      supplier_snapshot: supplier,
      purchase_order_ref: purchaseOrderRef?.trim() || null,
      cost_centre: costCentre?.trim() || null,
      issued_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (quoteError || !quote) {
    console.error("Quote save error:", quoteError);
    return NextResponse.json({ error: "Failed to create formal quote" }, { status: 500 });
  }

  const { error: versionError } = await supabaseAdmin
    .from("quote_versions")
    .insert({
      quote_id: quote.id,
      version_number: 1,
      reference,
      status: "issued",
      line_items: lineItems,
      billing_snapshot: billingSnapshot,
      supplier_snapshot: supplier,
      subtotal,
      vat,
      total,
      valid_until: validUntil,
      purchase_order_ref: purchaseOrderRef?.trim() || null,
      cost_centre: costCentre?.trim() || null,
      issued_at: quote.issued_at,
    });

  if (versionError) {
    console.error("Quote version save error:", versionError);
    await supabaseAdmin.from("quotes").delete().eq("id", quote.id);
    return NextResponse.json({ error: "Failed to record the formal quote version" }, { status: 500 });
  }

  const courseGroups = lineItems.reduce((acc, line) => {
    const key = line.courseName;
    if (!acc[key]) acc[key] = { count: 0, price: line.price, subtotal: 0 };
    acc[key].count++;
    acc[key].subtotal += line.price;
    return acc;
  }, {} as Record<string, { count: number; price: number; subtotal: number }>);

  const lineItemsHtml = Object.entries(courseGroups).map(([courseName, group]) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${group.count} × ${html(courseName)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatZar(group.price)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatZar(group.subtotal)}</td>
    </tr>
  `).join("");

  const buyerName = billingSnapshot.trading_name
    ? `${billingSnapshot.legal_entity_name} t/a ${billingSnapshot.trading_name}`
    : billingSnapshot.legal_entity_name;
  const supplierTitle = supplier.trading_name ? `${supplier.legal_name} t/a ${supplier.trading_name}` : supplier.legal_name;
  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#111827;">
      <div style="background:#0f1f3d;padding:24px 32px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:20px;">${html(supplierTitle)}</h1>
        <p style="color:#93c5fd;margin:4px 0 0;font-size:14px;">Training Quotation</p>
      </div>
      <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <table role="presentation" style="width:100%;margin-bottom:24px;"><tr>
          <td style="vertical-align:top;width:58%;">
            <p style="margin:0;font-weight:700;">${html(supplierTitle)}</p>
            ${supplier.registration_number ? `<p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Reg. no.: ${html(supplier.registration_number)}</p>` : ""}
            ${supplier.vat_number ? `<p style="margin:4px 0 0;color:#6b7280;font-size:13px;">VAT: ${html(supplier.vat_number)}</p>` : ""}
            ${supplier.address ? `<p style="margin:4px 0 0;color:#6b7280;font-size:13px;white-space:pre-line;">${html(supplier.address)}</p>` : ""}
          </td>
          <td style="vertical-align:top;text-align:right;">
            <p style="margin:0;font-weight:700;font-size:18px;color:#1d4ed8;">QUOTATION</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Ref: <strong>${html(reference)}</strong> · Version 1</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Issued: ${new Date().toLocaleDateString("en-ZA")}</p>
            <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Valid until: ${new Date(`${validUntil}T00:00:00`).toLocaleDateString("en-ZA")}</p>
          </td>
        </tr></table>
        <div style="margin-bottom:18px;padding:14px 16px;background:#f8fafc;border-left:3px solid #22c55e;">
          <p style="margin:0 0 5px;font-weight:700;">Bill to</p>
          <p style="margin:0;color:#374151;">${html(buyerName)}</p>
          ${billingSnapshot.registration_number ? `<p style="margin:3px 0 0;color:#6b7280;font-size:13px;">Reg. no.: ${html(billingSnapshot.registration_number)}</p>` : ""}
          ${billingSnapshot.vat_registered && billingSnapshot.vat_number ? `<p style="margin:3px 0 0;color:#6b7280;font-size:13px;">VAT: ${html(billingSnapshot.vat_number)}</p>` : ""}
          <p style="margin:3px 0 0;color:#6b7280;font-size:13px;white-space:pre-line;">${html(billingSnapshot.billing_address)}</p>
          <p style="margin:3px 0 0;color:#6b7280;font-size:13px;">Accounts: ${html(billingSnapshot.accounts_contact_name)} · ${html(billingSnapshot.accounts_email)}</p>
          ${quote.purchase_order_ref ? `<p style="margin:3px 0 0;color:#6b7280;font-size:13px;">PO reference: ${html(quote.purchase_order_ref)}</p>` : ""}
          ${quote.cost_centre ? `<p style="margin:3px 0 0;color:#6b7280;font-size:13px;">Cost centre: ${html(quote.cost_centre)}</p>` : ""}
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead><tr style="background:#f9fafb;"><th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Programme</th><th style="padding:10px 12px;text-align:right;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Unit price</th><th style="padding:10px 12px;text-align:right;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Amount</th></tr></thead>
          <tbody>${lineItemsHtml}</tbody>
          <tfoot><tr><td colspan="2" style="padding:8px 12px;text-align:right;color:#6b7280;">Subtotal</td><td style="padding:8px 12px;text-align:right;">${formatZar(subtotal)}</td></tr><tr><td colspan="2" style="padding:8px 12px;text-align:right;color:#6b7280;">VAT (15%)</td><td style="padding:8px 12px;text-align:right;">${formatZar(vat)}</td></tr><tr style="background:#f0fdf4;"><td colspan="2" style="padding:10px 12px;text-align:right;font-weight:700;">TOTAL</td><td style="padding:10px 12px;text-align:right;font-weight:700;color:#16a34a;">${formatZar(total)}</td></tr></tfoot>
        </table>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:18px;">
          <p style="margin:0 0 8px;font-weight:700;font-size:14px;">Payment options</p>
          <p style="margin:0;color:#374151;font-size:13px;">Pay securely by card from your GFA dashboard, or make an EFT using the details below.</p>
          <p style="margin:8px 0 0;color:#374151;font-size:13px;">Bank: <strong>${html(supplier.bank_name || "To be confirmed")}</strong></p>
          <p style="margin:4px 0 0;color:#374151;font-size:13px;">Account holder: ${html(supplier.bank_account_holder || supplier.legal_name)}</p>
          <p style="margin:4px 0 0;color:#374151;font-size:13px;">Account number: <strong>${html(supplier.bank_account || "To be confirmed")}</strong></p>
          <p style="margin:4px 0 0;color:#374151;font-size:13px;">Branch code: ${html(supplier.bank_branch || "To be confirmed")}</p>
          <p style="margin:8px 0 0;color:#374151;font-size:13px;">Use payment reference: <strong>${html(reference)}</strong></p>
        </div>
        <p style="color:#4b5563;font-size:13px;line-height:1.5;margin:0;">${html(supplier.payment_terms)}</p>
        ${supplier.terms_note ? `<p style="color:#6b7280;font-size:12px;line-height:1.5;margin:8px 0 0;">${html(supplier.terms_note)}</p>` : ""}
      </div>
    </div>
  `;

  if (process.env.BREVO_SMTP_PASSWORD) {
    try {
      const recipients = [...new Set([session.email, billingSnapshot.accounts_email].filter(Boolean))];
      await sendEmail({
        from: "abdool@transportactiongroup.co.za",
        fromName: "Green Freight Academy",
        to: recipients,
        subject: `GFA Training Quotation — ${reference}`,
        html: emailHtml,
      });

      const adminEmail = config.email_booking_to || "durbanroadtransport@gmail.com";
      await sendEmail({
        from: "abdool@transportactiongroup.co.za",
        fromName: "GFA Platform",
        to: adminEmail,
        subject: `New quote generated — ${session.companyName} — ${reference}`,
        html: `<p>A new formal quote was generated for <strong>${html(buyerName)}</strong>.</p><p>Reference: <strong>${html(reference)}</strong> · valid until ${html(validUntil)}</p><p>Subtotal: ${formatZar(subtotal)}</p><p>VAT: ${formatZar(vat)}</p><p>Total: <strong>${formatZar(total)}</strong></p><p>Drivers: ${items.length}</p>`,
      });
    } catch (emailError) {
      console.error("Quote email send error:", emailError);
    }
  } else {
    console.warn("BREVO_SMTP_PASSWORD not set — quote email skipped for", reference);
  }

  await adminNotify("quote_generated", {
    message: `${session.companyName} has generated a new formal training quote.`,
    actionUrl: "/admin/dashboard",
    details: {
      Company: billingSnapshot.legal_entity_name,
      "Quote Ref": reference,
      Drivers: String(items.length),
      Total: formatZar(total),
      "Valid Until": validUntil,
    },
  });

  await writeLedgerEntry({
    company_id: session.companyId,
    entry_type: "quote_issued",
    amount: total,
    description: `Formal quote issued — ${items.length} driver(s) — ${reference}`,
    reference,
    quote_id: quote.id,
    driver_count: items.length,
    status: "pending",
    created_by: "client",
  });

  return NextResponse.json({ ok: true, reference, total, quoteId: quote.id, validUntil, quoteVersion: 1 });
}
