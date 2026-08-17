"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Award, BarChart3, CheckCircle2, Clock, ShieldCheck, Users } from "lucide-react";

type Data = { profile: { rtms_status: string; annual_review_enabled: boolean }; summary: Record<string, number>; exceptions: { notStarted: unknown[]; annualReviewDueSoon: unknown[]; annualReviewOverdue: unknown[] } };
const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18, boxShadow: "0 1px 2px rgba(15,23,42,.04)" };
export default function CompliancePage() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => { fetch("/api/company/compliance/overview").then(r => r.json()).then(setData); }, []);
  if (!data) return <main style={{ padding: 32, fontFamily: "Arial" }}>Loading compliance reporting…</main>;
  const s = data.summary;
  const cards = [
    ["Drivers", s.totalDrivers, Users, "#0f766e"], ["Training complete", s.completed, CheckCircle2, "#16a34a"],
    ["Not started", s.notStarted, Clock, "#d97706"], ["Certificates", s.certifications, Award, "#2563eb"],
    ["Annual review due", s.annualReviewDueSoon, ShieldCheck, "#7c3aed"], ["Review overdue", s.annualReviewOverdue, AlertTriangle, "#dc2626"],
  ] as const;
  return <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "28px max(20px, 5vw)", fontFamily: "Arial, sans-serif", color: "#0f172a" }}>
    <Link href="/dashboard" style={{ color: "#0f766e", fontWeight: 700, textDecoration: "none" }}>← Back to Dashboard</Link>
    <header style={{ margin: "18px 0 22px" }}><div style={{ display: "flex", gap: 10, alignItems: "center" }}><BarChart3 color="#0f766e"/><h1 style={{ margin: 0 }}>Compliance & Safety Reporting</h1></div><p style={{ color: "#475569" }}>Track cohort progress, certificate evidence and annual competency-review actions.</p></header>
    {data.profile.annual_review_enabled && <div style={{ ...card, borderColor: "#c4b5fd", background: "#faf5ff", marginBottom: 18 }}>RTMS annual competency reviews are enabled for this account. A review due date is not a certificate expiry date.</div>}
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14 }}>{cards.map(([label, value, Icon, color]) => <div key={label} style={card}><Icon size={20} color={color}/><div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{value ?? 0}</div><div style={{ color: "#64748b", fontSize: 14 }}>{label}</div></div>)}</section>
    <section style={{ ...card, marginTop: 18 }}><h2 style={{ marginTop: 0 }}>Action queue</h2><p><b>{data.exceptions.notStarted.length}</b> enrolled drivers have not started training.</p><p><b>{data.exceptions.annualReviewDueSoon.length}</b> drivers have an annual competency review due within 30 days.</p><p><b>{data.exceptions.annualReviewOverdue.length}</b> drivers have an overdue annual competency review.</p><p style={{ color: "#64748b", marginBottom: 0 }}>Detailed cohort, safety briefing, certificate and controlled evidence-pack views will be added in the subsequent R7 releases.</p></section>
  </main>;
}
