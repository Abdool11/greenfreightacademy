import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

const NAVY: [number, number, number] = [19, 44, 80];
const GREEN: [number, number, number] = [0, 155, 50];
const BLUE: [number, number, number] = [18, 105, 199];
const PALE_BLUE: [number, number, number] = [239, 247, 255];
const MUTED: [number, number, number] = [90, 108, 128];
const TEXT: [number, number, number] = [23, 32, 51];
const LINE: [number, number, number] = [214, 224, 234];
const LETTERHEAD_PATH = path.join(process.cwd(), "public", "branding", "gfa-commercial-letterhead-strip.png");

export interface CertificatePdfInput {
  certificateNumber: string;
  certificateVersion: string;
  learnerName: string;
  programmeName: string;
  issuedAt: string;
  expiresAt?: string | null;
  verificationUrl: string;
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "No expiry recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fitText(doc: jsPDF, value: string, maxWidth: number, initialSize: number, minimumSize: number) {
  let size = initialSize;
  doc.setFont("helvetica", "bold");
  while (size > minimumSize && doc.getTextWidth(value) > maxWidth) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  return size;
}

function splitOneLineOrWrap(doc: jsPDF, value: string, maxWidth: number, initialSize: number, minimumSize: number) {
  const finalSize = fitText(doc, value, maxWidth, initialSize, minimumSize);
  doc.setFontSize(finalSize);
  return doc.splitTextToSize(value, maxWidth) as string[];
}

export async function buildCertificatePdf(input: CertificatePdfInput): Promise<{ buffer: Buffer; sha256: string }> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const letterhead = new Uint8Array(await readFile(LETTERHEAD_PATH));

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.8);
  doc.roundedRect(7, 7, pageWidth - 14, pageHeight - 14, 2.8, 2.8, "S");
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(1.55);
  doc.line(11, 13, pageWidth - 11, 13);

  // The existing GFA letterhead is retained; no commercial band, curved motifs or signature block are used.
  doc.addImage(letterhead, "PNG", 32, 16, pageWidth - 64, 23, undefined, "FAST");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.setFontSize(21);
  doc.text("CERTIFICATE OF COMPLETION", pageWidth / 2, 54, { align: "center" });
  doc.setTextColor(...GREEN);
  doc.setFontSize(8.4);
  doc.text("GREEN FREIGHT ACADEMY · DRIVER FOUNDATION", pageWidth / 2, 61, { align: "center" });
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.6);
  doc.line(pageWidth / 2 - 45, 65, pageWidth / 2 + 45, 65);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  doc.text("This certificate is presented to", pageWidth / 2, 81, { align: "center" });

  const learnerLines = splitOneLineOrWrap(doc, input.learnerName, pageWidth - 70, 25, 17);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  const learnerY = 96;
  doc.text(learnerLines, pageWidth / 2, learnerY, { align: "center", lineHeightFactor: 1.08 });
  const learnerBottom = learnerY + (learnerLines.length - 1) * doc.getFontSize() * 0.38;
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.45);
  doc.line(pageWidth / 2 - 51, learnerBottom + 4.8, pageWidth / 2 + 51, learnerBottom + 4.8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.4);
  doc.setTextColor(...MUTED);
  doc.text("for successfully completing the", pageWidth / 2, learnerBottom + 14, { align: "center" });

  const programmeLines = splitOneLineOrWrap(doc, input.programmeName, pageWidth - 64, 15.5, 11.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT);
  const programmeY = learnerBottom + 25;
  doc.text(programmeLines, pageWidth / 2, programmeY, { align: "center", lineHeightFactor: 1.1 });
  const programmeBottom = programmeY + (programmeLines.length - 1) * doc.getFontSize() * 0.4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("A Green Freight Academy learning certificate", pageWidth / 2, programmeBottom + 9, { align: "center" });

  const panelX = 40;
  const panelY = 143;
  const panelWidth = pageWidth - 80;
  const panelHeight = 27;
  doc.setFillColor(...PALE_BLUE);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.35);
  doc.roundedRect(panelX, panelY, panelWidth, panelHeight, 2, 2, "FD");
  const columns = [
    ["CERTIFICATE NUMBER", input.certificateNumber],
    ["ISSUED", dateLabel(input.issuedAt)],
    ["VALIDITY", input.expiresAt ? `Valid until ${dateLabel(input.expiresAt)}` : "No expiry recorded"],
  ];
  const colWidth = panelWidth / columns.length;
  columns.forEach(([label, value], index) => {
    const x = panelX + index * colWidth;
    if (index > 0) {
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.3);
      doc.line(x, panelY + 5, x, panelY + panelHeight - 5);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.6);
    doc.setTextColor(...MUTED);
    doc.text(label, x + colWidth / 2, panelY + 9, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(index === 0 ? 8 : 7.6);
    doc.setTextColor(...NAVY);
    doc.text(value, x + colWidth / 2, panelY + 18, { align: "center" });
  });

  const qrDataUrl = await QRCode.toDataURL(input.verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#132C50", light: "#FFFFFF" },
  });
  const qrX = pageWidth - 49;
  const qrY = 177;
  doc.setDrawColor(...LINE);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qrX - 4, qrY - 4, 34, 26, 1.4, 1.4, "FD");
  doc.addImage(qrDataUrl, "PNG", qrX, qrY, 16, 16, undefined, "FAST");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.4);
  doc.setTextColor(...NAVY);
  doc.text("VERIFY", qrX + 18, qrY + 6, { align: "left" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("at GFA", qrX + 18, qrY + 10.5, { align: "left" });
  doc.text("certificate registry", qrX + 18, qrY + 15, { align: "left" });

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.line(11, pageHeight - 13, pageWidth - 11, pageHeight - 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(...MUTED);
  doc.text(`Green Freight Academy · Certificate version ${input.certificateVersion}`, 11, pageHeight - 8.2);
  doc.text(`Verify: ${input.verificationUrl}`, pageWidth - 11, pageHeight - 8.2, { align: "right" });

  const buffer = Buffer.from(doc.output("arraybuffer"));
  return { buffer, sha256: createHash("sha256").update(buffer).digest("hex") };
}
