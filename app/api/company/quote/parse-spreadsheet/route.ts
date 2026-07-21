import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
    return NextResponse.json({ error: "Please upload a .csv, .xlsx, or .xls file" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const drivers: {
      first_name: string;
      last_name: string;
      mobile: string;
      email: string;
    }[] = [];

    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const name = String(row["Employee Name"] || row["Name"] || row["name"] || row["First Name"] || "").trim();
      const firstNameCol = String(row["First Name"] || row["first_name"] || row["FirstName"] || "").trim();
      const lastNameCol = String(row["Last Name"] || row["last_name"] || row["LastName"] || "").trim();
      const mobile = String(row["Mobile Number"] || row["Mobile"] || row["mobile"] || row["Phone"] || "").trim();
      const email = String(row["Email"] || row["email"] || "").trim().toLowerCase();

      let first_name: string;
      let last_name: string;

      if (firstNameCol || lastNameCol) {
        first_name = firstNameCol;
        last_name = lastNameCol;
      } else if (name) {
        const parts = name.split(" ");
        first_name = parts[0];
        last_name = parts.slice(1).join(" ");
      } else {
        errors.push({ row: rowNum, message: "Name is required" });
        continue;
      }

      if (!mobile) {
        errors.push({ row: rowNum, message: `Mobile number is required for ${first_name} ${last_name}` });
        continue;
      }

      drivers.push({ first_name, last_name, mobile, email });
    }

    return NextResponse.json({ drivers, errors, total: rows.length });
  } catch (err) {
    console.error("[parse-spreadsheet] error:", err);
    return NextResponse.json({ error: "Failed to parse file. Please ensure it is a valid CSV or Excel file." }, { status: 500 });
  }
}
