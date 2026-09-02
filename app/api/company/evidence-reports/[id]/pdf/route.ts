import { readFile } from "fs/promises";
import path from "path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const CONTENT_LEFT_MM = 14;
const CONTENT_RIGHT_MM = 14;
const CONTENT_TOP_MM = 42;
const CONTENT_BOTTOM_MM = 18;
const LETTERHEAD_PATH = path.join(process.cwd(), "public", "branding", "gfa-letterhead-a4.png");

type Driver = {
  id: string;
  first_name: string;
  last_name: string;
  mobile?: string;
};

type Enrolment = {
  driver_id: string;
  status: string;
  progress_percent: number;
  completed_at?: string | null;
  courses?: { name?: string } | null;
};

type EvidenceSnapshot = {
  company?: string;
  reportType?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  generatedAt?: string;
  drivers?: Driver[];
  enrolments?: Enrolment[];
};

type AutoTableDocument = jsPDF & {
  lastAutoTable?: { finalY?: number };
};

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-ZA", includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" });
}

function formatPeriod(start?: string | null, end?: string | null) {
  if (!start && !end) return "On-demand snapshot";
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  return start ? `From ${formatDate(start)}` : `Until ${formatDate(end)}`;
}

function formatReportType(reportType?: string | null) {
  if (!reportType || reportType === "monthly_compliance_summary" || reportType === "on_demand_compliance_safety_report") {
    return "On-Demand Compliance & Safety Report";
  }
  return reportType
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function displayStatus(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "certified") return "Certified";
  if (normalized === "completed" || normalized === "complete") return "Completed";
  if (normalized === "in_progress" || normalized === "in progress" || normalized === "active") return "In progress";
  if (normalized === "not_started" || normalized === "not started") return "Not started";
  return status?.replaceAll("_", " ") || "—";
}

function statusColor(status?: string | null): [number, number, number] {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "certified") return [22, 101, 52];
  if (normalized === "completed" || normalized === "complete") return [3, 105, 161];
  if (normalized === "in_progress" || normalized === "in progress" || normalized === "active") return [180, 83, 9];
  return [71, 85, 105];
}

function drawLetterhead(doc: jsPDF, letterhead: Uint8Array) {
  doc.addImage(letterhead, "PNG", 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, undefined, "FAST");
}

function drawFooter(doc: jsPDF) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(90, 100, 110);
  doc.text("Controlled Green Freight Academy evidence report — validate the control number before relying on it.", PAGE_WIDTH_MM / 2, 286, { align: "center" });
}

function drawSummaryCard(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: number,
  fill: [number, number, number],
  accent: [number, number, number],
) {
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, 54, 20, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(label, x + 4, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...accent);
  doc.text(String(value), x + 4, y + 15);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const actorId = session.supabase_user_id ?? session.id ?? session.companyId;
  const { data: report } = await supabaseAdmin
    .from("evidence_reports")
    .select("*")
    .eq("id", id)
    .eq("company_id", session.companyId)
    .eq("status", "active")
    .single();

  if (!report) return new NextResponse("Report not found", { status: 404 });

  let letterhead: Uint8Array;
  try {
    letterhead = new Uint8Array(await readFile(LETTERHEAD_PATH));
  } catch {
    return NextResponse.json({ error: "The GFA report letterhead is unavailable. Please contact an administrator." }, { status: 500 });
  }

  const snapshot = report.snapshot_json as EvidenceSnapshot;
  const drivers = snapshot.drivers || [];
  const enrolments = snapshot.enrolments || [];
  const doc = new jsPDF("p", "mm", "a4");
  const reportDocument = doc as AutoTableDocument;

  drawLetterhead(doc, letterhead);
  doc.setTextColor(15, 31, 61);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Compliance & Safety Evidence Pack", PAGE_WIDTH_MM / 2, CONTENT_TOP_MM + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Controlled on-demand training and certification evidence", PAGE_WIDTH_MM / 2, CONTENT_TOP_MM + 10, { align: "center" });

  const detailY = CONTENT_TOP_MM + 22;
  const valueX = 105;
  const fields: Array<[string, string]> = [
    ["Fleet / company", snapshot.company || session.companyName || "—"],
    ["Control No.", report.control_number],
    ["Report type", formatReportType(report.report_type || snapshot.reportType)],
    ["Reporting period", formatPeriod(report.reporting_period_start || snapshot.periodStart, report.reporting_period_end || snapshot.periodEnd)],
    ["Generated", formatDate(report.generated_at || snapshot.generatedAt, true)],
    ["Report status", "Active — controlled evidence snapshot"],
  ];

  doc.setFontSize(9);
  fields.forEach(([label, value], index) => {
    const y = detailY + index * 6;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 30, 45);
    doc.text(label, CONTENT_LEFT_MM, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(label === "Report status" ? 22 : 20, label === "Report status" ? 101 : 30, label === "Report status" ? 52 : 45);
    doc.text(value, valueX, y);
  });

  const checksumY = detailY + fields.length * 6 + 5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 30, 45);
  doc.setFontSize(8.5);
  doc.text("Integrity checksum", CONTENT_LEFT_MM, checksumY);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(CONTENT_LEFT_MM, checksumY + 3, PAGE_WIDTH_MM - CONTENT_LEFT_MM - CONTENT_RIGHT_MM, 10, 1.5, 1.5, "F");
  doc.setFont("courier", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(20, 30, 45);
  doc.text(report.sha256_checksum, CONTENT_LEFT_MM + 3, checksumY + 9.2);

  const tableTitleY = checksumY + 23;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 31, 61);
  doc.text("Driver Training Status", CONTENT_LEFT_MM, tableTitleY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Training, completion and certification status held in the controlled snapshot at the time of generation.", CONTENT_LEFT_MM, tableTitleY + 6);

  const body = enrolments.map((enrolment) => {
    const driver = drivers.find((candidate) => candidate.id === enrolment.driver_id);
    return [
      `${driver?.first_name || ""} ${driver?.last_name || ""}`.trim() || "—",
      driver?.mobile || "—",
      enrolment.courses?.name || "—",
      displayStatus(enrolment.status),
      `${enrolment.progress_percent || 0}%`,
      enrolment.completed_at ? formatDate(enrolment.completed_at) : "—",
    ];
  });

  autoTable(doc, {
    startY: tableTitleY + 10,
    margin: { top: CONTENT_TOP_MM + 12, right: CONTENT_RIGHT_MM, bottom: CONTENT_BOTTOM_MM, left: CONTENT_LEFT_MM },
    head: [["Driver", "Mobile", "Programme", "Status", "Progress", "Completed"]],
    body,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 7.8, cellPadding: 2, lineColor: [203, 213, 225], lineWidth: 0.25 },
    headStyles: { fillColor: [15, 31, 61], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 33 }, 1: { cellWidth: 27 }, 2: { cellWidth: 37 }, 3: { cellWidth: 24 }, 4: { cellWidth: 18, halign: "center" }, 5: { cellWidth: 27 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const [red, green, blue] = statusColor(String(data.cell.raw));
        data.cell.styles.textColor = [red, green, blue];
        data.cell.styles.fontStyle = "bold";
      }
    },
    willDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawLetterhead(doc, letterhead);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 31, 61);
        doc.text("Driver Training Status — continued", CONTENT_LEFT_MM, CONTENT_TOP_MM + 4);
      }
    },
    didDrawPage: () => drawFooter(doc),
  });

  const certified = enrolments.filter((enrolment) => String(enrolment.status).toLowerCase() === "certified").length;
  const completed = enrolments.filter((enrolment) => {
    const status = String(enrolment.status).toLowerCase();
    return status === "completed" || status === "complete";
  }).length;
  const inProgress = enrolments.filter((enrolment) => {
    const status = String(enrolment.status).toLowerCase();
    return status === "in_progress" || status === "in progress" || status === "active";
  }).length;

  let summaryY = (reportDocument.lastAutoTable?.finalY || tableTitleY + 15) + 9;
  if (summaryY + 45 > PAGE_HEIGHT_MM - CONTENT_BOTTOM_MM) {
    doc.addPage();
    drawLetterhead(doc, letterhead);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 31, 61);
    doc.text("Evidence Pack Summary", CONTENT_LEFT_MM, CONTENT_TOP_MM + 4);
    summaryY = CONTENT_TOP_MM + 12;
  }

  drawSummaryCard(doc, CONTENT_LEFT_MM, summaryY, "Certified", certified, [236, 253, 245], [22, 101, 52]);
  drawSummaryCard(doc, CONTENT_LEFT_MM + 59, summaryY, "Completed", completed, [239, 246, 255], [3, 105, 161]);
  drawSummaryCard(doc, CONTENT_LEFT_MM + 118, summaryY, "In progress", inProgress, [255, 251, 235], [180, 83, 9]);

  const statementY = summaryY + 30;
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(CONTENT_LEFT_MM, statementY, PAGE_WIDTH_MM - CONTENT_LEFT_MM - CONTENT_RIGHT_MM, 25, 1.5, 1.5, "F");
  doc.setFillColor(15, 118, 110);
  doc.rect(CONTENT_LEFT_MM, statementY, 2, 25, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(17, 94, 89);
  doc.text("Controlled-report statement", CONTENT_LEFT_MM + 5, statementY + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.3);
  doc.setTextColor(20, 30, 45);
  const statement = "This controlled report is generated from an immutable Green Freight Academy evidence snapshot. Validate the report control number and integrity checksum before relying on it.";
  doc.text(doc.splitTextToSize(statement, PAGE_WIDTH_MM - CONTENT_LEFT_MM - CONTENT_RIGHT_MM - 10), CONTENT_LEFT_MM + 5, statementY + 14);
  drawFooter(doc);

  await supabaseAdmin.from("evidence_report_events").insert({ report_id: report.id, event_type: "downloaded", actor_id: actorId });

  return new NextResponse(Buffer.from(doc.output("arraybuffer")), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${report.control_number}.pdf"`,
    },
  });
}
