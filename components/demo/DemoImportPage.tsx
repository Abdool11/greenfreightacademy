"use client";

import { Upload, Download, CheckCircle2, Users } from "lucide-react";
import { DEMO_DRIVERS } from "@/lib/demo-data";

export default function DemoImportPage() {
  return (
    <div style={{ paddingTop: "5rem", background: "#060e1c", minHeight: "100vh" }}>
      <section style={{
        padding: "3rem 0 2rem",
        background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div className="container-gfa">
          <span style={{
            background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "9999px", padding: "0.125rem 0.625rem",
            color: "#22c55e", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.05em",
            display: "inline-block", marginBottom: "0.75rem",
          }}>
            Import Drivers
          </span>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.75rem", fontWeight: 800, color: "#f9fafb" }}>
            Upload your driver cohort
          </h1>
          <p style={{ margin: 0, color: "#6b7280", maxWidth: "520px" }}>
            Download the Excel template, fill in your driver details, and upload it here.
            The system validates each row and shows you a preview before saving.
          </p>
        </div>
      </section>

      <div className="container-gfa" style={{ padding: "2.5rem 0 6rem" }}>

        {/* Template download */}
        <div style={{
          background: "#0d1520", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "0.875rem", padding: "1.25rem 1.5rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem",
        }}>
          <div>
            <p style={{ margin: "0 0 0.25rem", fontWeight: 600, color: "#f9fafb" }}>
              Step 1 — Download the import template
            </p>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
              Fill in: First Name, Last Name, Mobile, Email (optional), Branch, Region
            </p>
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
            borderRadius: "0.5rem", padding: "0.625rem 1.25rem",
            color: "#60a5fa", fontWeight: 600, fontSize: "0.875rem", cursor: "default",
          }}>
            <Download size={15} /> Download Template
          </span>
        </div>

        {/* Drop zone */}
        <div
          id="demo-import-dropzone"
          style={{
            border: "2px dashed rgba(34,197,94,0.35)",
            borderRadius: "0.875rem", padding: "3rem 2rem",
            textAlign: "center", marginBottom: "2rem",
            background: "rgba(34,197,94,0.03)",
          }}
        >
          <div style={{
            background: "rgba(34,197,94,0.1)", borderRadius: "50%",
            width: "56px", height: "56px",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem",
          }}>
            <Upload size={24} color="#22c55e" />
          </div>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 700, color: "#f9fafb", fontSize: "1.0625rem" }}>
            Drop your Excel file here
          </p>
          <p style={{ margin: "0 0 1.25rem", color: "#6b7280", fontSize: "0.875rem" }}>
            or click to browse — .xlsx and .xls supported
          </p>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "0.5rem", padding: "0.625rem 1.5rem",
            color: "#22c55e", fontWeight: 700, fontSize: "0.875rem", cursor: "default",
          }}>
            <Upload size={14} /> Choose file
          </span>
        </div>

        {/* Import result — demo shows a successful import */}
        <div
          id="demo-import-result"
          style={{
            background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: "0.875rem", padding: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <CheckCircle2 size={20} color="#22c55e" />
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: "#22c55e" }}>
                Import successful — 10 drivers added
              </p>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.8125rem" }}>
                0 rows skipped · 0 errors
              </p>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Name", "Mobile", "Branch", "Region", "Status"].map(h => (
                    <th key={h} style={{ padding: "0.5rem 0.875rem", textAlign: "left", color: "#6b7280", fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEMO_DRIVERS.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "0.5rem 0.875rem", color: "#f9fafb", fontWeight: 600 }}>
                      {d.first_name} {d.last_name}
                    </td>
                    <td style={{ padding: "0.5rem 0.875rem", color: "#9ca3af" }}>{d.mobile}</td>
                    <td style={{ padding: "0.5rem 0.875rem", color: "#9ca3af" }}>{d.branch}</td>
                    <td style={{ padding: "0.5rem 0.875rem", color: "#9ca3af" }}>{d.region}</td>
                    <td style={{ padding: "0.5rem 0.875rem" }}>
                      <span style={{
                        background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)",
                        borderRadius: "9999px", padding: "0.125rem 0.5rem",
                        color: "#22c55e", fontSize: "0.6875rem", fontWeight: 700,
                      }}>
                        Imported
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
