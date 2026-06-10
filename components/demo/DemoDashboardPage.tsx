"use client";

// ─── Demo Dashboard Page ──────────────────────────────────────────────────────
// Renders a fully populated, read-only dashboard using DEMO_* mock data.
// All interactive elements are present but disabled/no-op so the tour overlay
// can spotlight them without triggering real API calls.

import Link from "next/link";
import {
  Users, Award, Upload, CheckCircle2, Send,
  CreditCard, BarChart3, FileText, LogOut, Bell, BookOpen, Zap,
} from "lucide-react";
import {
  DEMO_COMPANY, DEMO_DRIVERS, DEMO_COURSES, DEMO_ENROLMENTS, DEMO_QUOTE,
} from "@/lib/demo-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = pct >= 100 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#3b82f6";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
      <span style={{ color: "#f9fafb", fontWeight: 700, fontSize: "0.8125rem" }}>{done}/{total}</span>
      <div style={{ width: "44px", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "9999px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "9999px" }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    enrolled:      { color: "#3b82f6", label: "Enrolled" },
    "in-progress": { color: "#f59e0b", label: "In Progress" },
    completed:     { color: "#8b5cf6", label: "Completed" },
    certified:     { color: "#22c55e", label: "Certified" },
    pending:       { color: "#6b7280", label: "Pending" },
    deployed:      { color: "#22c55e", label: "Deployed" },
  };
  const s = map[status] ?? { color: "#6b7280", label: status };
  return (
    <span style={{
      display: "inline-block", padding: "0.125rem 0.5rem",
      borderRadius: "9999px", fontSize: "0.6875rem", fontWeight: 600,
      background: s.color + "18", color: s.color, border: `1px solid ${s.color}30`,
    }}>
      {s.label}
    </span>
  );
}

// ─── Computed stats ───────────────────────────────────────────────────────────
const totalDrivers     = DEMO_DRIVERS.length;
const activatedDrivers = DEMO_ENROLMENTS.filter(e => e.link_activated).length;
const certifiedDrivers = DEMO_ENROLMENTS.filter(e => e.certified).length;

// Build enriched driver rows
const driverRows = DEMO_DRIVERS.map(d => ({
  ...d,
  enrolments: DEMO_ENROLMENTS
    .filter(e => e.driver_id === d.id)
    .map(e => ({
      ...e,
      courses: DEMO_COURSES.find(c => c.id === e.course_id) ?? null,
    })),
}));

export default function DemoDashboardPage() {
  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900, #060e1c)", minHeight: "100vh" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "1.5rem 0",
      }}>
        <div className="container-gfa" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span style={{
              background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "9999px", padding: "0.125rem 0.625rem",
              color: "#22c55e", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.05em",
              display: "inline-block", marginBottom: "0.5rem",
            }}>
              DEMO MODE — {DEMO_COMPANY.name}
            </span>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#f9fafb" }}>
              Company Dashboard
            </h1>
            <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
              {DEMO_COMPANY.contact_name} · {DEMO_COMPANY.contact_email}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {[
              { href: "#import",    icon: Upload,   label: "Import Drivers" },
              { href: "#campaigns", icon: BarChart3, label: "Training Campaigns" },
              { href: "#bulletins", icon: Bell,      label: "Bulletins" },
              { href: "#library",   icon: BookOpen,  label: "CPD Library" },
              { href: "#reports",   icon: BarChart3, label: "Reports" },
            ].map(l => (
              <span key={l.label} style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "0.5rem", padding: "0.5rem 1rem",
                color: "#9ca3af", fontSize: "0.8125rem", cursor: "default",
              }}>
                <l.icon size={14} /> {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="container-gfa" style={{ padding: "2.5rem 0 6rem" }}>

        {/* ── Stat cards ────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          {[
            { label: "Total Drivers",   value: totalDrivers,     Icon: Users,    color: "#3b82f6" },
            { label: "Link Activated",  value: activatedDrivers, Icon: Zap,      color: "#f59e0b" },
            { label: "Certified",       value: certifiedDrivers, Icon: Award,    color: "#22c55e" },
            { label: "Pending Quotes",  value: 0,                Icon: FileText, color: "#8b5cf6" },
          ].map(m => (
            <div key={m.label} style={{
              background: "#0d1520", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "0.875rem", padding: "1.25rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div style={{ background: m.color + "15", borderRadius: "0.5rem", padding: "0.5rem", color: m.color }}>
                  <m.Icon size={18} />
                </div>
                <span style={{ color: "#6b7280", fontSize: "0.8125rem" }}>{m.label}</span>
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f9fafb" }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* ── Driver training matrix ────────────────────────────────────────── */}
        <div id="demo-driver-table" style={{ marginBottom: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#f9fafb" }}>
              Driver Training Matrix
            </h2>
            <span style={{
              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: "0.5rem", padding: "0.375rem 0.875rem",
              color: "#60a5fa", fontSize: "0.8125rem", fontWeight: 600,
            }}>
              {totalDrivers} drivers
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Driver", "Branch", "Mobile", ...DEMO_COURSES.map(c => c.name), "Actions"].map(h => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {driverRows.map((d, i) => (
                  <tr key={d.id} style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  }}>
                    <td style={{ padding: "0.75rem 1rem", color: "#f9fafb", fontWeight: 600 }}>
                      {d.first_name} {d.last_name}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#9ca3af" }}>{d.branch}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#9ca3af" }}>{d.mobile}</td>
                    {DEMO_COURSES.map(c => {
                      const enr = d.enrolments.find(e => e.course_id === c.id);
                      return (
                        <td key={c.id} style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                          {enr ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
                              <StatusBadge status={enr.status} />
                              <ProgressBar done={enr.progress_modules} total={c.module_count} />
                            </div>
                          ) : (
                            <span style={{ color: "#374151", fontSize: "0.75rem" }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "0.375rem",
                        background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
                        borderRadius: "0.375rem", padding: "0.25rem 0.625rem",
                        color: "#f59e0b", fontSize: "0.75rem", cursor: "default",
                      }}>
                        <Send size={11} /> Nudge
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Quote panel ───────────────────────────────────────────────────── */}
        <div id="demo-quote-panel" style={{
          background: "#0d1520", border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: "0.875rem", padding: "1.5rem", marginBottom: "3rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 700, color: "#f9fafb" }}>
                Quote {DEMO_QUOTE.reference}
              </h3>
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.8125rem" }}>
                Created 28 March 2026 · Paid 29 March 2026 · Deployed
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#22c55e" }}>
                R{DEMO_QUOTE.total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
              </div>
              <StatusBadge status="deployed" />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "0.375rem",
              background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: "0.5rem", padding: "0.5rem 1rem",
              color: "#22c55e", fontSize: "0.8125rem", cursor: "default",
            }}>
              <CheckCircle2 size={14} /> Training Deployed
            </span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "0.375rem",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.5rem", padding: "0.5rem 1rem",
              color: "#9ca3af", fontSize: "0.8125rem", cursor: "default",
            }}>
              <CreditCard size={14} /> Payment confirmed
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
