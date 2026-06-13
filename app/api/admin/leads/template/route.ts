import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import * as XLSX from "xlsx";

// GET /api/admin/leads/template — download Excel import template
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  // Build template workbook
  const wb = XLSX.utils.book_new();

  // Template sheet with headers and example rows
  const templateData = [
    {
      "Company Name": "Example Logistics (Pty) Ltd",
      "Contact Name": "John Smith",
      "Email": "john.smith@examplelogistics.co.za",
      "Phone": "+27 82 123 4567",
      "Notes": "Met at Transport Forum 2025. Interested in PTDP for 20 drivers.",
    },
    {
      "Company Name": "SA Freight Solutions",
      "Contact Name": "Sarah Dlamini",
      "Email": "sarah@safreight.co.za",
      "Phone": "+27 73 987 6543",
      "Notes": "Referred by Transnet. Fleet of 45 trucks.",
    },
    {
      "Company Name": "",
      "Contact Name": "",
      "Email": "",
      "Phone": "",
      "Notes": "",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  ws["!cols"] = [
    { wch: 35 }, // Company Name
    { wch: 25 }, // Contact Name
    { wch: 35 }, // Email
    { wch: 20 }, // Phone
    { wch: 50 }, // Notes
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Leads");

  // Instructions sheet
  const instructions = [
    { "Instructions": "GreenFreightAcademy — Lead Import Template" },
    { "Instructions": "" },
    { "Instructions": "1. Fill in the 'Leads' sheet with your prospect data." },
    { "Instructions": "2. Do not change the column headers in row 1." },
    { "Instructions": "3. Company Name or Email is required for each row." },
    { "Instructions": "4. Delete the example rows before importing." },
    { "Instructions": "5. Save as .xlsx and upload in the GFA Admin Leads panel." },
    { "Instructions": "" },
    { "Instructions": "Columns:" },
    { "Instructions": "  Company Name — Full legal name of the prospect company" },
    { "Instructions": "  Contact Name — Name of the primary contact person" },
    { "Instructions": "  Email — Contact email address" },
    { "Instructions": "  Phone — Mobile number (include country code, e.g. +27 82 ...)" },
    { "Instructions": "  Notes — Any relevant notes about this prospect" },
  ];

  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  wsInstructions["!cols"] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="GFA_Lead_Import_Template.xlsx"',
    },
  });
}
