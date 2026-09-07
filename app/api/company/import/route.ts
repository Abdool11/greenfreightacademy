import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validateDriverIdentity } from "@/lib/driverIdentity";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const imported: string[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    // Normalise column names (handle case variations)
    const name = (row["Employee Name"] || row["name"] || row["Name"] || "").toString().trim();
    const mobile = (row["Mobile Number"] || row["mobile"] || row["Mobile"] || "").toString().trim();
    const altMobile = (row["Alternative Number"] || row["alt_mobile"] || row["Alt Mobile"] || "").toString().trim();
    const email = (row["Email"] || row["email"] || "").toString().trim().toLowerCase();
    const branch = (row["Branch"] || row["branch"] || "").toString().trim();
    const region = (row["Region"] || row["region"] || "").toString().trim();
    const rawIdentity = (row["ID Number"] || row["ID / Passport"] || row["Passport Number"] || row["id_number"] || "").toString().trim();

    if (!name) {
      errors.push({ row: rowNum, message: "Employee name is required" });
      continue;
    }
    if (!mobile) {
      errors.push({ row: rowNum, message: `Row ${rowNum}: Mobile number is required for ${name}` });
      continue;
    }

    const identity = validateDriverIdentity(rawIdentity);
    if (!identity.ok) {
      errors.push({ row: rowNum, message: `Row ${rowNum}: ${identity.error}` });
      continue;
    }

    // Split name into first/last
    const nameParts = name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    // Upsert driver (match on mobile + company)
    const { data: driver, error } = await supabaseAdmin
      .from("drivers")
      .upsert({
        company_id: session.companyId,
        first_name: firstName,
        last_name: lastName,
        mobile,
        alt_mobile: altMobile || null,
        email: email || null,
        branch: branch || null,
        region: region || null,
        id_number: identity.normalised,
        status: "active",
      }, {
        onConflict: "company_id,mobile",
        ignoreDuplicates: false,
      })
      .select("id")
      .single();

    if (error) {
      errors.push({ row: rowNum, message: `Failed to import ${name}: ${error.message}` });
    } else {
      imported.push(driver.id);
    }
  }

  return NextResponse.json({
    imported: imported.length,
    total: rows.length,
    errors,
  });
}

// Download Excel template
export async function GET() {
  const wb = XLSX.utils.book_new();
  const headers = [["Employee Name", "Mobile Number", "Alternative Number", "Email", "Branch", "Region", "ID Number"]];
  const ws = XLSX.utils.aoa_to_sheet(headers);
  ws["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 28 }, { wch: 20 }, { wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, "Drivers");

  const instructions = XLSX.utils.aoa_to_sheet([
    ["GFA Driver Import Instructions"],
    ["Employee Name", "Required. Use the driver’s first and surname."],
    ["Mobile Number", "Required. Enter a South African mobile number, for example 0821234567."],
    ["Alternative Number", "Optional."],
    ["Email", "Optional."],
    ["Branch / Region", "Optional operational fields."],
    ["ID Number", "Required. Enter a valid 13-digit South African ID or a 6–20 character passport number."],
    ["Privacy", "The Drivers sheet is intentionally blank. Do not retain, share or reuse another company’s driver data."],
  ]);
  instructions["!cols"] = [{ wch: 24 }, { wch: 96 }];
  XLSX.utils.book_append_sheet(wb, instructions, "Instructions");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="GFA_Driver_Import_Template.xlsx"',
    },
  });
}
