"use client";

import { useState } from "react";
import Link from "next/link";
import { FileCheck2, Loader2, ShieldCheck } from "lucide-react";

type Report = {
  id: string;
  control_number: string;
  sha256_checksum: string;
  generated_at: string;
};

export default function EvidenceReportsPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/company/evidence-reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportType: "on_demand_compliance_safety_report" }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Could not generate the report");
      return;
    }

    setReport(data.report);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "28px max(20px,5vw)", fontFamily: "Arial,sans-serif", color: "#0f172a" }}>
      <Link href="/dashboard/compliance" style={{ color: "#0f766e", fontWeight: 700, textDecoration: "none" }}>← Compliance &amp; Safety Reporting</Link>
      <h1 style={{ marginBottom: 8 }}>Controlled Evidence Packs</h1>
      <p style={{ maxWidth: 700, color: "#475569" }}>
        Generate a controlled on-demand snapshot of your fleet’s training, completion and certification evidence. Each report receives a unique control number and integrity checksum. Certificate expiry dates are not displayed by default.
      </p>
      <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 22, maxWidth: 760 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ShieldCheck color="#0f766e" />
          <b>On-Demand Compliance &amp; Safety Report</b>
        </div>
        <p style={{ color: "#64748b" }}>
          Includes the fleet’s stored driver training progress, completion and certification evidence in an immutable snapshot at the time of generation.
        </p>
        <button onClick={generate} disabled={loading} style={{ background: "#0f766e", color: "white", border: 0, borderRadius: 8, padding: "11px 16px", fontWeight: 700, cursor: "pointer" }}>
          {loading ? <><Loader2 size={16} style={{ verticalAlign: "middle" }} /> Generating…</> : "Generate on-demand PDF"}
        </button>
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {report && (
          <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: "#ecfdf5" }}>
            <FileCheck2 color="#16a34a" />
            <p><b>Evidence pack created.</b><br />Control number: <code>{report.control_number}</code></p>
            <a href={`/api/company/evidence-reports/${report.id}/pdf`} style={{ display: "inline-block", background: "#166534", color: "white", padding: "10px 14px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>Download PDF evidence pack</a>
            <p style={{ fontSize: 12, color: "#475569" }}>Integrity checksum: {report.sha256_checksum}</p>
          </div>
        )}
      </section>
    </main>
  );
}
