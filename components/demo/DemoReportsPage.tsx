"use client";

import { Award, Users, TrendingUp, Star, Download } from "lucide-react";
import { DEMO_REPORTS } from "@/lib/demo-data";

function StarRating({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < Math.round(value) ? "#f59e0b" : "none"}
          color={i < Math.round(value) ? "#f59e0b" : "#374151"}
        />
      ))}
      <span style={{ marginLeft: "0.375rem", color: "#9ca3af", fontSize: "0.8125rem" }}>
        {value.toFixed(1)}
      </span>
    </span>
  );
}

export default function DemoReportsPage() {
  const r = DEMO_REPORTS;

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
            Reports
          </span>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.75rem", fontWeight: 800, color: "#f9fafb" }}>
            Progress and certification reports
          </h1>
          <p style={{ margin: 0, color: "#6b7280", maxWidth: "520px" }}>
            A full picture of your training investment — completion rates, certification counts, progress by branch, and driver feedback.
          </p>
        </div>
      </section>

      <div className="container-gfa" style={{ padding: "2.5rem 0 6rem" }}>

        {/* Summary stats */}
        <div
          id="demo-reports-summary"
          style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1rem", marginBottom: "2.5rem",
          }}
        >
          {[
            { label: "Total Drivers",    value: r.summary.total_drivers,    Icon: Users,      color: "#3b82f6" },
            { label: "Link Activated",   value: r.summary.activated,        Icon: TrendingUp, color: "#f59e0b" },
            { label: "In Progress",      value: r.summary.in_progress,      Icon: TrendingUp, color: "#8b5cf6" },
            { label: "Certified",        value: r.summary.certified,        Icon: Award,      color: "#22c55e" },
            { label: "Completion Rate",  value: `${r.summary.completion_rate}%`, Icon: Award, color: "#22c55e" },
            { label: "Avg Progress",     value: `${r.summary.avg_progress_pct}%`, Icon: TrendingUp, color: "#f59e0b" },
          ].map(m => (
            <div key={m.label} style={{
              background: "#0d1520", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "0.875rem", padding: "1.25rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.625rem" }}>
                <div style={{ background: m.color + "15", borderRadius: "0.5rem", padding: "0.375rem", color: m.color }}>
                  <m.Icon size={16} />
                </div>
                <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>{m.label}</span>
              </div>
              <div style={{ fontSize: "1.625rem", fontWeight: 800, color: "#f9fafb" }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* By programme */}
        <div style={{
          background: "#0d1520", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "0.875rem", padding: "1.5rem", marginBottom: "2rem",
        }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#f9fafb" }}>
            Performance by programme
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Programme", "Enrolled", "Certified", "In Progress", "Not Started"].map(h => (
                    <th key={h} style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: "0.75rem" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.by_programme.map(p => (
                  <tr key={p.programme} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "0.75rem 1rem", color: "#f9fafb", fontWeight: 600 }}>{p.programme}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#9ca3af" }}>{p.enrolled}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ color: "#22c55e", fontWeight: 700 }}>{p.certified}</span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#f59e0b" }}>{p.in_progress}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#ef4444" }}>{p.not_started}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* By branch */}
        <div
          id="demo-reports-branch"
          style={{
            background: "#0d1520", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "0.875rem", padding: "1.5rem", marginBottom: "2rem",
          }}
        >
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#f9fafb" }}>
            Performance by branch
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {r.by_branch.map(b => (
              <div key={b.branch} style={{
                display: "flex", alignItems: "center", gap: "1rem",
                flexWrap: "wrap",
              }}>
                <span style={{ width: "120px", color: "#f9fafb", fontWeight: 600, fontSize: "0.875rem" }}>
                  {b.branch}
                </span>
                <span style={{ color: "#6b7280", fontSize: "0.8125rem", width: "80px" }}>
                  {b.enrolled} drivers
                </span>
                <div style={{ flex: 1, minWidth: "120px" }}>
                  <div style={{ height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "9999px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${b.avg_progress}%`,
                      background: b.avg_progress >= 80 ? "#22c55e" : b.avg_progress >= 50 ? "#f59e0b" : "#ef4444",
                      borderRadius: "9999px",
                    }} />
                  </div>
                </div>
                <span style={{
                  fontWeight: 700, fontSize: "0.875rem",
                  color: b.avg_progress >= 80 ? "#22c55e" : b.avg_progress >= 50 ? "#f59e0b" : "#ef4444",
                  width: "50px", textAlign: "right",
                }}>
                  {b.avg_progress}%
                </span>
                <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                  {b.certified} certified
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div style={{
          background: "#0d1520", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "0.875rem", padding: "1.5rem", marginBottom: "2rem",
        }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#f9fafb" }}>
            Driver feedback ({r.feedback.count} responses)
          </h3>
          <div style={{ display: "flex", gap: "2.5rem", flexWrap: "wrap" }}>
            {[
              { label: "Understanding",      value: r.feedback.understanding },
              { label: "Enjoyment",          value: r.feedback.enjoyment },
              { label: "Want more learning", value: r.feedback.more_learning },
            ].map(f => (
              <div key={f.label}>
                <p style={{ margin: "0 0 0.375rem", color: "#6b7280", fontSize: "0.8125rem" }}>{f.label}</p>
                <StarRating value={f.value} />
              </div>
            ))}
          </div>
        </div>

        {/* Export buttons */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {["Export as PDF", "Export as Excel"].map(label => (
            <span key={label} style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.5rem", padding: "0.625rem 1.25rem",
              color: "#9ca3af", fontSize: "0.875rem", cursor: "default", fontWeight: 600,
            }}>
              <Download size={14} /> {label}
            </span>
          ))}
        </div>

      </div>
    </div>
  );
}
