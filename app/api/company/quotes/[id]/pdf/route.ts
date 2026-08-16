import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { asBillingSnapshot, BillingProfile, getSupplierProfile, SupplierProfile } from "@/lib/quoteProfiles";

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

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - 14;

  doc.setFillColor(15, 31, 61);
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(supplierName, 14, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Training Quotation", 14, 23);
  doc.setTextColor(147, 197, 253);
  doc.setFontSize(9);
  doc.text(`Ref: ${quote.reference} · Version ${quote.quote_version || 1}`, rightX, 14, { align: "right" });
  doc.text(`Issued: ${new Date(quote.issued_at || quote.created_at).toLocaleDateString("en-ZA")}`, rightX, 20, { align: "right" });
  if (quote.valid_until) doc.text(`Valid until: ${new Date(`${quote.valid_until}T00:00:00`).toLocaleDateString("en-ZA")}`, rightX, 26, { align: "right" });

  doc.setTextColor(17, 24, 39);
  let y = 45;
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text("Supplier", 14, y);
  doc.setFont("helvetica", "normal");
  y += 5;
  doc.text(supplierName, 14, y);
  y += 4.5;
  if (supplier.registration_number) { doc.text(`Reg. no.: ${supplier.registration_number}`, 14, y); y += 4.5; }
  if (supplier.vat_number) { doc.text(`VAT: ${supplier.vat_number}`, 14, y); y += 4.5; }
  if (supplier.address) { const lines = doc.splitTextToSize(supplier.address, 75); doc.text(lines, 14, y); y += lines.length * 4.5; }

  let buyerY = 45;
  const buyerX = 108;
  doc.setFont("helvetica", "bold");
  doc.text("Bill to", buyerX, buyerY);
  doc.setFont("helvetica", "normal");
  buyerY += 5;
  doc.text(billingName, buyerX, buyerY);
  buyerY += 4.5;
  if (stringValue(billing.registration_number)) { doc.text(`Reg. no.: ${stringValue(billing.registration_number)}`, buyerX, buyerY); buyerY += 4.5; }
  if (boolValue(billing.vat_registered) && stringValue(billing.vat_number)) { doc.text(`VAT: ${stringValue(billing.vat_number)}`, buyerX, buyerY); buyerY += 4.5; }
  if (stringValue(billing.billing_address)) { const lines = doc.splitTextToSize(stringValue(billing.billing_address), 85); doc.text(lines, buyerX, buyerY); buyerY += lines.length * 4.5; }
  if (stringValue(billing.accounts_contact_name) || stringValue(billing.accounts_email)) {
    doc.text(`Accounts: ${stringValue(billing.accounts_contact_name)} ${stringValue(billing.accounts_email) ? `· ${stringValue(billing.accounts_email)}` : ""}`, buyerX, buyerY);
    buyerY += 4.5;
  }
  if (quote.purchase_order_ref) { doc.text(`PO reference: ${quote.purchase_order_ref}`, buyerX, buyerY); buyerY += 4.5; }
  if (quote.cost_centre) doc.text(`Cost centre: ${quote.cost_centre}`, buyerX, buyerY);

  y = Math.max(y, buyerY) + 8;
  const courseGroups = lineItems.reduce((acc, line) => {
    const key = line.courseName || "Unknown";
    if (!acc[key]) acc[key] = { count: 0, price: Number(line.price || 0), subtotal: 0 };
    acc[key].count++;
    acc[key].subtotal += Number(line.price || 0);
    return acc;
  }, {} as Record<string, { count: number; price: number; subtotal: number }>);

  autoTable(doc, {
    startY: y,
    head: [["Programme", "Unit Price", "Amount"]],
    body: Object.entries(courseGroups).map(([courseName, group]) => [
      `${group.count} × ${courseName}`,
      money(group.price),
      money(group.subtotal),
    ]),
    theme: "grid",
    headStyles: { fillColor: [15, 31, 61], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { font: "helvetica", fontSize: 9.5, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { halign: "right" }, 2: { halign: "right" } },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 9;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99);
  doc.text(`Subtotal: ${money(subtotal)}`, rightX, y, { align: "right" });
  y += 6;
  doc.text(`VAT (15%): ${money(vat)}`, rightX, y, { align: "right" });
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text(`TOTAL: ${money(total)}`, rightX, y, { align: "right" });

  y += 15;
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(10);
  doc.text("Payment Details", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const paymentLines = [
    `Bank: ${supplier.bank_name || "To be confirmed"}`,
    `Account holder: ${supplier.bank_account_holder || supplier.legal_name}`,
    `Account: ${supplier.bank_account || "To be confirmed"}`,
    `Branch code: ${supplier.bank_branch || "To be confirmed"}`,
    `Payment reference: ${quote.reference}`,
  ];
  doc.text(paymentLines, 14, y);
  y += paymentLines.length * 4.5 + 4;
  doc.setTextColor(107, 114, 128);
  doc.text(doc.splitTextToSize(supplier.payment_terms, pageWidth - 28), 14, y);
  if (supplier.terms_note) {
    y += 9;
    doc.text(doc.splitTextToSize(supplier.terms_note, pageWidth - 28), 14, y);
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="GFA-Quote-${quote.reference}.pdf"`,
    },
  });
}
