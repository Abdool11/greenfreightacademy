import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  drawCommercialCallout,
  drawCommercialContinuationHeader,
  drawCommercialFooter,
  drawCommercialHeader,
  drawCommercialInfoPanel,
  drawCommercialSectionTitle,
} from "@/lib/commercialPdfBranding";
import { formatVatLabel, parseVatRate } from "@/lib/commercialTax";

export const dynamic = "force-dynamic";

interface InvoiceLineItem {
  driverName?: string;
  courseName?: string;
  price?: number;
  quantity?: number;
  description?: string;
  amount?: number;
}

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
);
const value = (source: Record<string, unknown>, key: string) => typeof source[key] === "string" ? source[key] : "";
const money = (amount: number) => `R ${Number(amount || 0).toFixed(2)}`;
const titleCase = (status: unknown) => String(status || "issued").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [session, adminSession] = await Promise.all([getSession(), getAdminSession()]);
  if (!session && !adminSession) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!id) return new NextResponse("Missing invoice id", { status: 400 });

  let invoiceQuery = supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("id", id);
  if (session) invoiceQuery = invoiceQuery.eq("company_id", session.companyId);
  const { data: invoice, error } = await invoiceQuery.single();
  if (error || !invoice) return new NextResponse("Invoice not found", { status: 404 });

  const supplier = asRecord(invoice.supplier_snapshot);
  const billing = asRecord(invoice.billing_profile_snapshot);
  const lineItems: InvoiceLineItem[] = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const supplierName = value(supplier, "trading_name")
    ? `${value(supplier, "legal_name")} t/a ${value(supplier, "trading_name")}`
    : value(supplier, "legal_name") || "Green Freight Academy";
  const billingName = value(billing, "trading_name")
    ? `${value(billing, "legal_entity_name")} t/a ${value(billing, "trading_name")}`
    : value(billing, "legal_entity_name") || session?.companyName || "Client company";
  const vatRate = parseVatRate(invoice.vat_rate, 0);
  const isTaxInvoice = Boolean(value(supplier, "vat_number")) && vatRate > 0;
  const documentLabel = isTaxInvoice ? "Tax Invoice" : "Invoice";
  const issuedAt = invoice.issued_at || invoice.created_at;
  const dueAt = invoice.due_at || issuedAt;

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = await drawCommercialHeader(doc, {
    documentLabel,
    referenceLabel: "Invoice",
    reference: invoice.invoice_number,
    issuedLabel: "Issued",
    issuedAt,
    dueOrValidityLabel: "Due",
    dueOrValidityValue: dueAt,
    statusLabel: titleCase(invoice.status),
  });

  const partyHeight = 39;
  drawCommercialInfoPanel(doc, "Supplier", [
    supplierName,
    value(supplier, "registration_number") ? `Reg. no.: ${value(supplier, "registration_number")}` : "",
    value(supplier, "vat_number") ? `VAT: ${value(supplier, "vat_number")}` : "",
    value(supplier, "address"),
  ], 14, y, 84, partyHeight);
  drawCommercialInfoPanel(doc, "Bill to", [
    billingName,
    value(billing, "registration_number") ? `Reg. no.: ${value(billing, "registration_number")}` : "",
    Boolean(billing.vat_registered) && value(billing, "vat_number") ? `VAT: ${value(billing, "vat_number")}` : "",
    value(billing, "billing_address"),
    value(billing, "accounts_contact_name") || value(billing, "accounts_email")
      ? `Accounts: ${value(billing, "accounts_contact_name")}${value(billing, "accounts_email") ? ` · ${value(billing, "accounts_email")}` : ""}`
      : "",
  ], 102, y, 94, partyHeight);
  y += partyHeight + 8;

  drawCommercialSectionTitle(doc, "Charges", y);
  y += 7;
  const grouped = lineItems.reduce((acc, line) => {
    const description = line.description || line.courseName || "Training programme";
    const unit = Number(line.price ?? line.amount ?? 0);
    const quantity = Number(line.quantity ?? 1);
    if (!acc[description]) acc[description] = { quantity: 0, unit, amount: 0 };
    acc[description].quantity += quantity;
    acc[description].amount += Number(line.amount ?? (unit * quantity));
    return acc;
  }, {} as Record<string, { quantity: number; unit: number; amount: number }>);

  autoTable(doc, {
    startY: y,
    margin: { top: 24, bottom: 24, left: 14, right: 14 },
    head: [["Description", "Unit price", "Amount"]],
    body: Object.entries(grouped).map(([description, item]) => [
      `${item.quantity} × ${description}`,
      money(item.unit),
      money(item.amount),
    ]),
    theme: "plain",
    headStyles: { fillColor: [19, 44, 80], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.2, cellPadding: 2.6 },
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.5, lineColor: [214, 224, 234], lineWidth: 0.2 },
    bodyStyles: { textColor: [23, 32, 51] },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { halign: "right", cellWidth: 34 }, 2: { halign: "right", cellWidth: 34 } },
    willDrawPage: (data) => {
      if (data.pageNumber > 1) drawCommercialContinuationHeader(doc, documentLabel, invoice.invoice_number);
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  if (y > pageHeight - 70) {
    doc.addPage();
    y = drawCommercialContinuationHeader(doc, documentLabel, invoice.invoice_number);
  }

  const rightX = pageWidth - 14;
  doc.setFontSize(8.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99);
  doc.text(`Subtotal: ${money(Number(invoice.subtotal))}`, rightX, y, { align: "right" });
  y += 5.8;
  doc.text(`${formatVatLabel(vatRate)}: ${money(Number(invoice.vat))}`, rightX, y, { align: "right" });
  y += 7;
  doc.setDrawColor(0, 155, 50);
  doc.setLineWidth(0.45);
  doc.line(pageWidth - 75, y - 3.2, rightX, y - 3.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 119, 43);
  doc.text(`TOTAL: ${money(Number(invoice.total))}`, rightX, y + 2, { align: "right" });
  y += 10;
  doc.setFontSize(8.5);
  doc.setTextColor(23, 32, 51);
  doc.text(`Amount paid: ${money(Number(invoice.amount_paid))}`, rightX, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(Number(invoice.amount_due) > 0 ? 180 : 0, Number(invoice.amount_due) > 0 ? 83 : 119, Number(invoice.amount_due) > 0 ? 9 : 43);
  doc.text(`AMOUNT DUE: ${money(Number(invoice.amount_due))}`, rightX, y, { align: "right" });
  y += 13;

  if (y > pageHeight - 56) {
    doc.addPage();
    y = drawCommercialContinuationHeader(doc, documentLabel, invoice.invoice_number);
  }
  drawCommercialSectionTitle(doc, "Payment details", y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(48, 68, 92);
  const paymentLines = [
    `Bank: ${value(supplier, "bank_name") || "To be confirmed"}`,
    `Account holder: ${value(supplier, "bank_account_holder") || value(supplier, "legal_name")}`,
    `Account: ${value(supplier, "bank_account") || "To be confirmed"}`,
    `Branch code: ${value(supplier, "bank_branch") || "To be confirmed"}`,
    `Payment reference: ${invoice.invoice_number}`,
    invoice.purchase_order_ref ? `PO reference: ${invoice.purchase_order_ref}` : "",
    invoice.cost_centre ? `Cost centre: ${invoice.cost_centre}` : "",
  ].filter(Boolean);
  doc.text(paymentLines, 14, y, { lineHeightFactor: 1.45 });
  y += paymentLines.length * 4.1 + 4;
  drawCommercialCallout(doc, String(invoice.payment_terms || "Payment is due by the date stated on this invoice."), y);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    drawCommercialFooter(doc, page, invoice.invoice_number);
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="GFA-${documentLabel.replace(/\s+/g, "-")}-${invoice.invoice_number}.pdf"`,
    },
  });
}
