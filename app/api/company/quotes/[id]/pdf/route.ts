import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const dynamic = "force-dynamic";

interface QuoteLineItem {
  driverName?: string;
  driverMobile?: string;
  courseName?: string;
  price?: number;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return new NextResponse("Missing quote id", { status: 400 });
  }

  const { data: quote, error } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("id", id)
    .eq("company_id", session.companyId)
    .single();

  if (error || !quote) {
    return new NextResponse("Quote not found", { status: 404 });
  }

  const configs = await getConfigs([
    "company_name",
    "company_vat_number",
    "company_address",
    "company_email",
    "company_phone",
    "company_bank_name",
    "company_bank_account",
    "company_bank_branch",
  ]);

  const lineItems: QuoteLineItem[] = Array.isArray(quote.line_items)
    ? quote.line_items
    : [];
  const subtotal =
    Number(quote.subtotal) ||
    lineItems.reduce((sum, l) => sum + Number(l.price || 0), 0);
  const total = Number(quote.total) || 0;
  const vat = Number(quote.vat) || total - subtotal;

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - 14;

  // Header band
  doc.setFillColor(15, 31, 61);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("GreenFreightAcademy", 14, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Training Quotation", 14, 23);

  doc.setTextColor(147, 197, 253);
  doc.setFontSize(10);
  doc.text(`Ref: ${quote.reference}`, rightX, 14, { align: "right" });
  doc.text(
    new Date(quote.created_at).toLocaleDateString("en-ZA"),
    rightX,
    20,
    { align: "right" }
  );

  // Company and bill-to block
  doc.setTextColor(17, 24, 39);
  let y = 42;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(configs.company_name || "GreenFreightAcademy", 14, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(`VAT: ${configs.company_vat_number || "TBC"}`, 14, y);
  y += 6;
  if (configs.company_address) {
    doc.text(configs.company_address, 14, y);
    y += 6;
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Bill to:", 14, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(session.companyName, 14, y);
  y += 6;
  doc.text(session.email, 14, y);
  y += 12;

  // Line items table
  autoTable(doc, {
    startY: y,
    head: [["Driver", "Programme", "Amount"]],
    body: lineItems.map((l) => [
      l.driverName || "",
      l.courseName || "",
      `R ${Number(l.price || 0).toFixed(2)}`,
    ]),
    theme: "grid",
    headStyles: {
      fillColor: [15, 31, 61],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: "auto" },
      2: { halign: "right" },
    },
  });

  // Totals
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 40;
  y = finalY + 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(75, 85, 99);
  doc.text(`Subtotal: R ${subtotal.toFixed(2)}`, rightX, y, { align: "right" });
  y += 6;
  doc.text(`VAT (15%): R ${vat.toFixed(2)}`, rightX, y, { align: "right" });
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text(`TOTAL: R ${total.toFixed(2)}`, rightX, y, { align: "right" });
  doc.setTextColor(17, 24, 39);

  // Payment details
  y += 14;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 24, 39);
  doc.text("Payment Details", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Bank: ${configs.company_bank_name || "TBC"}`, 14, y);
  y += 6;
  doc.text(`Account: ${configs.company_bank_account || "TBC"}`, 14, y);
  y += 6;
  doc.text(`Branch Code: ${configs.company_bank_branch || "TBC"}`, 14, y);
  y += 6;
  doc.text(`Reference: ${quote.reference}`, 14, y);
  y += 10;

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `Pay online via "Pay Now" in your dashboard or email proof of payment to ${configs.company_email || "info@greenfreightacademy.com"}.`,
    14,
    y,
    { maxWidth: pageWidth - 28 }
  );

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="GFA-Quote-${quote.reference}.pdf"`,
    },
  });
}
