import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { asBillingSnapshot, BillingProfile, getSupplierProfile, SupplierProfile } from "@/lib/quoteProfiles";
import {
  drawCommercialCallout,
  drawCommercialContinuationHeader,
  drawCommercialFooter,
  drawCommercialHeader,
  drawCommercialInfoPanel,
  drawCommercialSectionTitle,
  formatDocumentDate,
} from "@/lib/commercialPdfBranding";

export const dynamic = "force-dynamic";

interface QuoteLineItem {
  driverName?: string;
  driverMobile?: string;
  courseName?: string;
  price?: number;
}

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
);
const stringValue = (value: unknown) => typeof value === "string" ? value : "";
const boolValue = (value: unknown) => Boolean(value);
const money = (value: number) => `R ${value.toFixed(2)}`;
const vatLabel = (subtotal: number, vat: number) => {
  if (subtotal <= 0 || vat <= 0) return "VAT";
  const rate = (vat / subtotal) * 100;
  const display = Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `VAT (${display}%)`;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!id) return new NextResponse("Missing quote id", { status: 400 });

  const { data: quote, error } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("id", id)
    .eq("company_id", session.companyId)
    .single();
  if (error || !quote) return new NextResponse("Quote not found", { status: 404 });

  const lineItems: QuoteLineItem[] = Array.isArray(quote.line_items) ? quote.line_items : [];
  const fallbackSubtotal = lineItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const subtotal = Number(quote.subtotal ?? fallbackSubtotal);
  const discountAmount = Number(quote.discount_amount ?? 0);
  const listSubtotal = Number(quote.list_subtotal ?? (subtotal + discountAmount));
  const discountPercent = Number(quote.discount_percent ?? 0);
  const vat = Number(quote.vat ?? Math.round(subtotal * 0.15 * 100) / 100);
  const total = Number(quote.total ?? subtotal + vat);

  const [supplierFallback, billingFallback] = await Promise.all([
    getSupplierProfile(),
    supabaseAdmin
      .from("company_billing_profiles")
      .select("*")
      .eq("company_id", session.companyId)
      .maybeSingle(),
  ]);

  const supplierRaw = asRecord(quote.supplier_snapshot);
  const supplier: SupplierProfile = Object.keys(supplierRaw).length > 0
    ? {
        ...supplierFallback,
        legal_name: stringValue(supplierRaw.legal_name) || supplierFallback.legal_name,
        trading_name: stringValue(supplierRaw.trading_name),
        registration_number: stringValue(supplierRaw.registration_number),
        vat_number: stringValue(supplierRaw.vat_number),
        address: stringValue(supplierRaw.address),
        email: stringValue(supplierRaw.email) || supplierFallback.email,
        phone: stringValue(supplierRaw.phone),
        bank_name: stringValue(supplierRaw.bank_name),
        bank_account: stringValue(supplierRaw.bank_account),
        bank_branch: stringValue(supplierRaw.bank_branch),
        bank_account_holder: stringValue(supplierRaw.bank_account_holder),
        bank_account_type: stringValue(supplierRaw.bank_account_type),
        bank_product_type: stringValue(supplierRaw.bank_product_type),
        quote_validity_days: Number(supplierRaw.quote_validity_days) || supplierFallback.quote_validity_days,
        payment_terms: stringValue(supplierRaw.payment_terms) || supplierFallback.payment_terms,
        terms_note: stringValue(supplierRaw.terms_note),
      }
    : supplierFallback;

  const billingRaw = asRecord(quote.billing_profile_snapshot);
  const billingSource = billingFallback.data as BillingProfile | null;
  const billing = Object.keys(billingRaw).length > 0
    ? billingRaw
    : billingSource ? asBillingSnapshot(billingSource) : {
        legal_entity_name: session.companyName,
        trading_name: "",
        registration_number: "",
        vat_registered: false,
        vat_number: "",
        billing_address: "",
        accounts_contact_name: "",
        accounts_email: session.email,
        accounts_phone: "",
      };

  const billingName = stringValue(billing.trading_name)
    ? `${stringValue(billing.legal_entity_name)} t/a ${stringValue(billing.trading_name)}`
    : stringValue(billing.legal_entity_name) || session.companyName;
  const supplierName = supplier.trading_name ? `${supplier.legal_name} t/a ${supplier.trading_name}` : supplier.legal_name;
  const issuedAt = quote.issued_at || quote.created_at || new Date().toISOString();
  const validUntil = quote.valid_until || issuedAt;

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = await drawCommercialHeader(doc, {
    documentLabel: "Training Quotation",
    referenceLabel: "Ref",
    reference: quote.reference,
    issuedLabel: "Issued",
    issuedAt,
    dueOrValidityLabel: "Valid until",
    dueOrValidityValue: validUntil,
  });

  const partyHeight = 39;
  drawCommercialInfoPanel(doc, "Supplier", [
    supplierName,
    supplier.registration_number ? `Reg. no.: ${supplier.registration_number}` : "",
    supplier.vat_number ? `VAT: ${supplier.vat_number}` : "",
    supplier.address,
  ], 14, y, 84, partyHeight);
  drawCommercialInfoPanel(doc, "Bill to", [
    billingName,
    stringValue(billing.registration_number) ? `Reg. no.: ${stringValue(billing.registration_number)}` : "",
    boolValue(billing.vat_registered) && stringValue(billing.vat_number) ? `VAT: ${stringValue(billing.vat_number)}` : "",
    stringValue(billing.billing_address),
    stringValue(billing.accounts_contact_name) || stringValue(billing.accounts_email)
      ? `Accounts: ${stringValue(billing.accounts_contact_name)}${stringValue(billing.accounts_email) ? ` · ${stringValue(billing.accounts_email)}` : ""}`
      : "",
  ], 102, y, 94, partyHeight);
  y += partyHeight + 8;

  drawCommercialSectionTitle(doc, "Training programme investment", y);
  y += 7;
  const courseGroups = lineItems.reduce((acc, line) => {
    const key = line.courseName || "Training programme";
    if (!acc[key]) acc[key] = { count: 0, price: Number(line.price || 0), subtotal: 0 };
    acc[key].count += 1;
    acc[key].subtotal += Number(line.price || 0);
    return acc;
  }, {} as Record<string, { count: number; price: number; subtotal: number }>);

  autoTable(doc, {
    startY: y,
    margin: { top: 24, bottom: 24, left: 14, right: 14 },
    head: [["Programme", "Unit price", "Amount"]],
    body: Object.entries(courseGroups).map(([courseName, group]) => [
      `${group.count} × ${courseName}`,
      money(group.price),
      money(group.subtotal),
    ]),
    theme: "plain",
    headStyles: { fillColor: [19, 44, 80], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.2, cellPadding: 2.6 },
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.5, lineColor: [214, 224, 234], lineWidth: 0.2 },
    bodyStyles: { textColor: [23, 32, 51] },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { halign: "right", cellWidth: 34 }, 2: { halign: "right", cellWidth: 34 } },
    willDrawPage: (data) => {
      if (data.pageNumber > 1) drawCommercialContinuationHeader(doc, "Training Quotation", quote.reference);
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  if (y > pageHeight - 67) {
    doc.addPage();
    y = drawCommercialContinuationHeader(doc, "Training Quotation", quote.reference);
  }

  const rightX = pageWidth - 14;
  doc.setFontSize(8.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99);
  if (discountAmount > 0) {
    doc.text(`List subtotal: ${money(listSubtotal)}`, rightX, y, { align: "right" });
    y += 5.8;
    doc.setTextColor(180, 83, 9);
    doc.text(`Approved discount${discountPercent ? ` (${discountPercent.toFixed(2)}%)` : ""}: -${money(discountAmount)}`, rightX, y, { align: "right" });
    y += 5.8;
    doc.setTextColor(75, 85, 99);
  }
  doc.text(`Subtotal: ${money(subtotal)}`, rightX, y, { align: "right" });
  y += 5.8;
  doc.text(`${vatLabel(subtotal, vat)}: ${money(vat)}`, rightX, y, { align: "right" });
  y += 7;
  doc.setDrawColor(0, 155, 50);
  doc.setLineWidth(0.45);
  doc.line(pageWidth - 75, y - 3.2, rightX, y - 3.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 119, 43);
  doc.text(`TOTAL: ${money(total)}`, rightX, y + 2, { align: "right" });
  y += 13;

  if (y > pageHeight - 56) {
    doc.addPage();
    y = drawCommercialContinuationHeader(doc, "Training Quotation", quote.reference);
  }
  drawCommercialSectionTitle(doc, "Payment details", y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(48, 68, 92);
  const paymentLines = [
    `Bank: ${supplier.bank_name || "To be confirmed"}`,
    `Account holder: ${supplier.bank_account_holder || supplier.legal_name}`,
    `Account: ${supplier.bank_account || "To be confirmed"}`,
    `Branch code: ${supplier.bank_branch || "To be confirmed"}`,
    `Payment reference: ${quote.reference}`,
    quote.purchase_order_ref ? `PO reference: ${quote.purchase_order_ref}` : "",
    quote.cost_centre ? `Cost centre: ${quote.cost_centre}` : "",
  ].filter(Boolean);
  doc.text(paymentLines, 14, y, { lineHeightFactor: 1.45 });
  y += paymentLines.length * 4.1 + 4;
  drawCommercialCallout(doc, supplier.payment_terms || "Payment is required before training is deployed.", y);
  y += 18;
  if (supplier.terms_note) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(90, 108, 128);
    doc.text(doc.splitTextToSize(supplier.terms_note, pageWidth - 28), 14, y);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    drawCommercialFooter(doc, page, quote.reference);
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="GFA-Quote-${quote.reference}.pdf"`,
    },
  });
}
