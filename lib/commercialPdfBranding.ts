import { readFile } from "fs/promises";
import path from "path";
import { jsPDF } from "jspdf";

export interface CommercialPdfHeaderOptions {
  documentLabel: string;
  referenceLabel: string;
  reference: string;
  issuedLabel: string;
  issuedAt: Date | string;
  dueOrValidityLabel: string;
  dueOrValidityValue: Date | string;
  statusLabel?: string;
}

const NAVY: [number, number, number] = [19, 44, 80];
const GREEN: [number, number, number] = [0, 155, 50];
const PALE_BLUE: [number, number, number] = [239, 247, 255];
let letterheadStripPromise: Promise<string> | undefined;

function asDataUrl(bytes: Buffer) {
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

async function getLetterheadStrip() {
  if (!letterheadStripPromise) {
    const stripPath = path.join(process.cwd(), "public", "branding", "gfa-commercial-letterhead-strip.png");
    letterheadStripPromise = readFile(stripPath).then(asDataUrl);
  }
  return letterheadStripPromise;
}

export function formatDocumentDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-ZA");
}

export async function drawCommercialHeader(doc: jsPDF, options: CommercialPdfHeaderOptions) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const strip = await getLetterheadStrip();
  doc.addImage(strip, "PNG", 0, 0, pageWidth, 29.4);

  doc.setFillColor(...GREEN);
  doc.rect(0, 29.4, pageWidth, 0.7, "F");
  doc.setFillColor(...NAVY);
  doc.rect(0, 30.1, pageWidth, 22.9, "F");

  doc.setDrawColor(53, 173, 75);
  doc.setLineWidth(0.55);
  doc.ellipse(pageWidth - 9, 56, 37, 20, "S");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.4);
  doc.text("COMMERCIAL DOCUMENT", 14, 38.6);
  doc.setFontSize(15);
  doc.text(options.documentLabel.toUpperCase(), 14, 47.1);

  const rightX = pageWidth - 15;
  const metadata = [
    `${options.referenceLabel}: ${options.reference}`,
    `${options.issuedLabel}: ${formatDocumentDate(options.issuedAt)}`,
    `${options.dueOrValidityLabel}: ${formatDocumentDate(options.dueOrValidityValue)}`,
  ];
  if (options.statusLabel) metadata.push(options.statusLabel);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.3);
  doc.setTextColor(219, 234, 254);
  doc.text(metadata, rightX, 37.9, { align: "right", lineHeightFactor: 1.5 });

  doc.setTextColor(23, 32, 51);
  return 60;
}

export function drawCommercialContinuationHeader(doc: jsPDF, documentLabel: string, reference: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 17, "F");
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageWidth, 0.7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`${documentLabel.toUpperCase()} · CONTINUED`, 14, 10.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(219, 234, 254);
  doc.text(reference, pageWidth - 14, 10.5, { align: "right" });
  doc.setTextColor(23, 32, 51);
  return 24;
}

export function drawCommercialSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(title, 14, y);
  doc.setDrawColor(214, 224, 234);
  doc.setLineWidth(0.25);
  doc.line(14, y + 2.5, doc.internal.pageSize.getWidth() - 14, y + 2.5);
  doc.setTextColor(23, 32, 51);
}

export function drawCommercialFooter(doc: jsPDF, pageNumber: number, reference: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.35);
  doc.line(14, pageHeight - 13.5, 64, pageHeight - 13.5);
  doc.setDrawColor(18, 105, 199);
  doc.line(64, pageHeight - 13.5, pageWidth - 14, pageHeight - 13.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.7);
  doc.setTextColor(90, 108, 128);
  doc.text(`Green Freight Academy · Commercial document · ${reference}`, 14, pageHeight - 9);
  doc.text(`Page ${pageNumber}`, pageWidth - 14, pageHeight - 9, { align: "right" });
  doc.setTextColor(23, 32, 51);
}

export function drawCommercialInfoPanel(doc: jsPDF, title: string, lines: string[], x: number, y: number, width: number, height: number) {
  doc.setDrawColor(214, 224, 234);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, width, height, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.1);
  doc.setTextColor(90, 108, 128);
  doc.text(title.toUpperCase(), x + 3.4, y + 5.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(23, 32, 51);
  let cursor = y + 10;
  lines.filter(Boolean).forEach((line) => {
    const wrapped = doc.splitTextToSize(line, width - 6.8);
    doc.text(wrapped, x + 3.4, cursor);
    cursor += Math.max(4.2, wrapped.length * 4.2);
  });
  doc.setTextColor(23, 32, 51);
}

export function drawCommercialCallout(doc: jsPDF, text: string, y: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PALE_BLUE);
  doc.roundedRect(14, y, pageWidth - 28, 15, 1.5, 1.5, "F");
  doc.setFillColor(18, 105, 199);
  doc.rect(14, y, 1.3, 15, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(48, 68, 92);
  doc.text(doc.splitTextToSize(text, pageWidth - 35), 18, y + 5.3, { lineHeightFactor: 1.35 });
  doc.setTextColor(23, 32, 51);
}
