"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Download, Award, Users, TrendingUp,
  CheckCircle2, Clock, Loader2, BarChart3,
} from "lucide-react";

interface Enrolment {
  id: string;
  status: string;
  progress_percent: number;
  enrolled_at: string | null;
  completed_at: string | null;
  certified_at: string | null;
  courses: { name: string; slug: string } | null;
}

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  mobile: string;
  activation_status: string;
  enrolments: Enrolment[];
}

interface Certification {
  id: string;
  certificate_number: string;
  issued_at: string;
  expires_at: string | null;
  status: string;
  driver_id: string;
  courses: { name: string } | null;
}

interface Summary {
  totalDrivers: number;
  enrolled: number;
  inProgress: number;
  certified: number;
  notStarted: number;
  avgProgress: number;
}

const statusMeta = (status: string, progress: number): { label: string; color: string } => {
  if (status === "certified" || status === "completed") return { label: "Certified",   color: "#22c55e" };
  if (status === "in_progress" || status === "active")  return { label: "In Progress", color: "#f59e0b" };
  if (progress > 0)                                     return { label: "Started",     color: "#3b82f6" };
  return                                                       { label: "Not Started", color: "#6b7280" };
};

export default function ReportsPage() {
  const [drivers, setDrivers]         = useState<Driver[]>([]);
  const [certs, setCerts]             = useState<Certification[]>([]);
  const [summary, setSummary]         = useState<Summary | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState<"progress" | "certs">("progress");

  useEffect(() => {
    fetch("/api/company/reports")
      .then(r => r.json())
      .then(d => {
        if (d.error === "Unauthorized") { window.location.href = "/login"; return; }
        setDrivers(d.drivers ?? []);
        setCerts(d.certifications ?? []);
        setSummary(d.summary ?? null);
        setCompanyName(d.company?.name ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const exportProgressCsv = () => {
    const rows = drivers.flatMap(d =>
      (d.enrolments ?? []).map(e => [
        `${d.first_name} ${d.last_name}`, d.mobile,
        e.courses?.name ?? "—",
        statusMeta(e.status, e.progress_percent).label,
        String(e.progress_percent) + "%",
        e.enrolled_at  ? new Date(e.enrolled_at).toLocaleDateString("en-ZA")  : "—",
        e.certified_at ? new Date(e.certified_at).toLocaleDateString("en-ZA") : "—",
      ])
    );
    const csv = ["Driver,Mobile,Programme,Status,Progress,Enrolled,Certified", ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `GFA-Training-Report-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCertsCsv = () => {
    const rows = certs.map(c => {
      const driver = drivers.find(d => d.id === c.driver_id);
      return [
        driver ? `${driver.first_name} ${driver.last_name}` : "—", driver?.mobile ?? "—",
        c.courses?.name ?? "—", c.certificate_number,
        new Date(c.issued_at).toLocaleDateString("en-ZA"),
        c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-ZA") : "No expiry",
        c.status,
      ];
    });
    const csv = ["Driver,Mobile,Programme,Certificate Number,Issued,Expires,Status", ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `GFA-Certification-Register-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const s = {
    page:   { paddingTop: "5rem", background: "#0a1628", minHeight: "100vh", color: "#f9fafb" } as React.CSSProperties,
    header: { background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "2rem 0" } as React.CSSProperties,
    inner:  { maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.5rem 4rem" } as React.CSSProperties,
    card:   { background: "#0d1526", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.875rem", padding: "1.25rem", marginBottom: "1.25rem" } as React.CSSProperties,
    stat:   (accent: string) => ({ background: "#0d1526", border: `1px solid ${accent}25`, borderLeft: `3px solid ${accent}`, borderRadius: "0.75rem", padding: "1rem" }) as React.CSSProperties,
    th:     { padding: "0.625rem 0.875rem", color: "#6b7280", fontSize: "0.75rem", fontWeight: 700, textAlign: "left" as const, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" as const },
    td:     { padding: "0.75rem 0.875rem", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.875rem", verticalAlign: "middle" as const },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div className="container-gfa">
          <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "#6b7280", fontSize: "0.875rem", textDecoration: "none", marginBottom: "1rem" }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <span className="pill-badge pill-green" style={{ marginBottom: "0.75rem", display: "inline-flex" }}>Reports</span>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem" }}>Training Reports</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9375rem" }}>
            Progress, certification records, and performance summaries for {companyName || "your fleet"}.
          </p>
        </div>
      </div>

      <div style={s.inner}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280" }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: "0 auto 1rem", display: "block" }} />
            Loading your reports…
          </div>
        ) : (
          <>
            {summary && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                {[
                  { label: "Total Drivers", value: summary.totalDrivers, accent: "#3b82f6", Icon: Users },
                  { label: "Enrolled",      value: summary.enrolled,     accent: "#a78bfa", Icon: TrendingUp },
                  { label: "In Progress",   value: summary.inProgress,   accent: "#f59e0b", Icon: Clock },
                  { label: "Certified",     value: summary.certified,    accent: "#22c55e", Icon: Award },
                  { label: "Avg Progress",  value: `${summary.avgProgress}%`, accent: "#3b82f6", Icon: BarChart3 },
                  { label: "Certificates",  value: certs.length,         accent: "#22c55e", Icon: CheckCircle2 },
                ].map(m => (
                  <div key={m.label} style={s.stat(m.accent)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
                      <m.Icon size={13} style={{ color: m.accent }} />
                      <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>{m.label}</span>
                    </div>
                    <div style={{ fontSize: "1.375rem", fontWeight: 700, color: m.accent }}>{m.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", background: "#0d1526", borderRadius: "0.75rem", padding: "0.25rem", width: "fit-content" }}>
              {[
                { id: "progress" as const, label: "Training Progress" },
                { id: "certs"    as const, label: `Certification Register (${certs.length})` },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, background: activeTab === t.id ? "#22c55e" : "transparent", color: activeTab === t.id ? "#000" : "#9ca3af" }}>
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === "progress" && (
              <div style={s.card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ margin: 0, fontSize: "0.9375rem" }}>Driver Training Progress</h3>
                  <button onClick={exportProgressCsv} style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", padding: "0.375rem 0.875rem", color: "#9ca3af", fontSize: "0.8125rem", cursor: "pointer" }}>
                    <Download size={13} /> Export CSV
                  </button>
                </div>
                {drivers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "#4b5563" }}>
                    <Users size={32} style={{ margin: "0 auto 0.75rem", display: "block" }} />
                    <p style={{ margin: 0 }}>No drivers added yet. <Link href="/dashboard" style={{ color: "#22c55e" }}>Add drivers</Link> to see their progress here.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>{["Driver","Mobile","Programme","Status","Progress","Enrolled","Certified"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {drivers.flatMap(d =>
                          d.enrolments.length === 0 ? [(
                            <tr key={d.id}>
                              <td style={{...s.td,fontWeight:600}}>{d.first_name} {d.last_name}</td>
                              <td style={{...s.td,color:"#9ca3af"}}>{d.mobile}</td>
                              <td style={{...s.td,color:"#4b5563"}}>—</td>
                              <td style={s.td}><span style={{background:"rgba(107,114,128,0.12)",color:"#6b7280",borderRadius:"9999px",padding:"0.125rem 0.5rem",fontSize:"0.6875rem",fontWeight:700}}>Not Enrolled</span></td>
                              <td style={{...s.td,color:"#4b5563"}}>—</td><td style={{...s.td,color:"#4b5563"}}>—</td><td style={{...s.td,color:"#4b5563"}}>—</td>
                            </tr>
                          )] : d.enrolments.map(e => {
                            const st = statusMeta(e.status, e.progress_percent);
                            return (
                              <tr key={e.id}>
                                <td style={{...s.td,fontWeight:600}}>{d.first_name} {d.last_name}</td>
                                <td style={{...s.td,color:"#9ca3af"}}>{d.mobile}</td>
                                <td style={{...s.td,color:"#d1d5db"}}>{e.courses?.name ?? "—"}</td>
                                <td style={s.td}><span style={{background:st.color+"18",color:st.color,borderRadius:"9999px",padding:"0.125rem 0.5rem",fontSize:"0.6875rem",fontWeight:700}}>{st.label}</span></td>
                                <td style={s.td}>
                                  <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                                    <div style={{flex:1,height:"4px",background:"rgba(255,255,255,0.08)",borderRadius:"9999px",overflow:"hidden",minWidth:"60px"}}>
                                      <div style={{width:`${e.progress_percent}%`,height:"100%",background:st.color,borderRadius:"9999px"}}/>
                                    </div>
                                    <span style={{color:st.color,fontSize:"0.75rem",fontWeight:700,whiteSpace:"nowrap"}}>{e.progress_percent}%</span>
                                  </div>
                                </td>
                                <td style={{...s.td,color:"#9ca3af",whiteSpace:"nowrap"}}>{e.enrolled_at?new Date(e.enrolled_at).toLocaleDateString("en-ZA"):"—"}</td>
                                <td style={{...s.td,color:"#9ca3af",whiteSpace:"nowrap"}}>{e.certified_at?new Date(e.certified_at).toLocaleDateString("en-ZA"):"—"}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "certs" && (
              <div style={s.card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ margin: 0, fontSize: "0.9375rem" }}>Certification Register</h3>
                  <button onClick={exportCertsCsv} style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", padding: "0.375rem 0.875rem", color: "#9ca3af", fontSize: "0.8125rem", cursor: "pointer" }}>
                    <Download size={13} /> Export CSV
                  </button>
                </div>
                <p style={{ margin: "0 0 1rem", color: "#6b7280", fontSize: "0.8125rem" }}>Suitable for RTMS compliance submissions and insurance documentation.</p>
                {certs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "#4b5563" }}>
                    <Award size={32} style={{ margin: "0 auto 0.75rem", display: "block" }} />
                    <p style={{ margin: 0 }}>No certifications issued yet.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr>{["Driver","Mobile","Programme","Certificate Number","Issued","Expires","Status"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {certs.map(c => {
                          const driver = drivers.find(d => d.id === c.driver_id);
                          return (
                            <tr key={c.id}>
                              <td style={{...s.td,fontWeight:600}}>{driver?`${driver.first_name} ${driver.last_name}`:"—"}</td>
                              <td style={{...s.td,color:"#9ca3af"}}>{driver?.mobile??"—"}</td>
                              <td style={{...s.td,color:"#d1d5db"}}>{c.courses?.name??"—"}</td>
                              <td style={{...s.td,fontFamily:"monospace",color:"#22c55e",fontSize:"0.8125rem"}}>{c.certificate_number}</td>
                              <td style={{...s.td,color:"#9ca3af",whiteSpace:"nowrap"}}>{new Date(c.issued_at).toLocaleDateString("en-ZA")}</td>
                              <td style={{...s.td,color:"#9ca3af",whiteSpace:"nowrap"}}>{c.expires_at?new Date(c.expires_at).toLocaleDateString("en-ZA"):"No expiry"}</td>
                              <td style={s.td}><span style={{background:c.status==="active"?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)",color:c.status==="active"?"#22c55e":"#ef4444",borderRadius:"9999px",padding:"0.125rem 0.5rem",fontSize:"0.6875rem",fontWeight:700}}>{c.status}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
