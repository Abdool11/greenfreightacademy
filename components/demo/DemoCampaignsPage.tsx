"use client";

import { Bell, CheckCircle2, Clock, AlertCircle, Star, ChevronDown } from "lucide-react";
import { DEMO_CAMPAIGNS } from "@/lib/demo-data";

function StarRating({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          fill={i < Math.round(value) ? "#f59e0b" : "none"}
          color={i < Math.round(value) ? "#f59e0b" : "#374151"}
        />
      ))}
      <span style={{ marginLeft: "0.25rem", color: "#9ca3af", fontSize: "0.75rem" }}>
        {value.toFixed(1)}
      </span>
    </span>
  );
}

export default function DemoCampaignsPage() {
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
            Training Campaigns
          </span>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.75rem", fontWeight: 800, color: "#f9fafb" }}>
            Monitor cohort progress
          </h1>
          <p style={{ margin: 0, color: "#6b7280", maxWidth: "520px" }}>
            Track how each cohort is progressing in real time. Send WhatsApp nudges to drivers who have not yet started or are falling behind.
          </p>
        </div>
      </section>

      <div className="container-gfa" style={{ padding: "2.5rem 0 6rem" }}>
        <div id="demo-campaigns-list" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {DEMO_CAMPAIGNS.map(camp => (
            <div key={camp.id} style={{
              background: "#0d1520", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "0.875rem", overflow: "hidden",
            }}>
              {/* Campaign header */}
              <div style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: "0.75rem",
              }}>
                <div>
                  <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 700, color: "#f9fafb" }}>
                    {camp.name}
                  </h3>
                  <p style={{ margin: 0, color: "#6b7280", fontSize: "0.8125rem" }}>
                    {camp.start_date} → {camp.end_date} · {camp.daysRemaining} days remaining
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{
                    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                    borderRadius: "9999px", padding: "0.125rem 0.625rem",
                    color: "#22c55e", fontSize: "0.75rem", fontWeight: 700,
                  }}>
                    Active
                  </span>
                  <span style={{ color: "#22c55e", fontWeight: 700, fontSize: "0.875rem" }}>
                    {camp.progressPct}% elapsed
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: "4px", background: "rgba(255,255,255,0.06)" }}>
                <div style={{
                  height: "100%", width: `${camp.progressPct}%`,
                  background: "linear-gradient(90deg, #22c55e, #16a34a)",
                }} />
              </div>

              {/* Stats row */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                gap: "1px", background: "rgba(255,255,255,0.04)",
              }}>
                {[
                  { label: "Total",       value: camp.stats.total,      Icon: Users,        color: "#3b82f6" },
                  { label: "Not started", value: camp.stats.notStarted, Icon: AlertCircle,  color: "#ef4444" },
                  { label: "In progress", value: camp.stats.inProgress, Icon: Clock,        color: "#f59e0b" },
                  { label: "Completed",   value: camp.stats.completed,  Icon: CheckCircle2, color: "#22c55e" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#0d1520", padding: "1rem", textAlign: "center" }}>
                    <s.Icon size={16} color={s.color} style={{ margin: "0 auto 0.375rem", display: "block" }} />
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f9fafb" }}>{s.value}</div>
                    <div style={{ fontSize: "0.6875rem", color: "#6b7280" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Outstanding drivers */}
              {camp.stats.outstanding.length > 0 && (
                <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ margin: "0 0 0.75rem", fontWeight: 600, color: "#f59e0b", fontSize: "0.875rem" }}>
                    Outstanding drivers requiring follow-up
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {camp.stats.outstanding.map(o => (
                      <div key={o.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "rgba(255,255,255,0.03)", borderRadius: "0.5rem",
                        padding: "0.625rem 1rem", flexWrap: "wrap", gap: "0.5rem",
                      }}>
                        <div>
                          <span style={{ fontWeight: 600, color: "#f9fafb", fontSize: "0.875rem" }}>
                            {o.drivers?.first_name} {o.drivers?.last_name}
                          </span>
                          <span style={{ color: "#6b7280", fontSize: "0.8125rem", marginLeft: "0.75rem" }}>
                            {o.courses?.name}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>
                            {o.progress_percent}% complete
                          </span>
                          <span
                            id={o.id === camp.stats.outstanding[0].id ? "demo-nudge-button" : undefined}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "0.375rem",
                              background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
                              borderRadius: "0.375rem", padding: "0.25rem 0.75rem",
                              color: "#f59e0b", fontSize: "0.75rem", cursor: "default", fontWeight: 600,
                            }}
                          >
                            <Bell size={11} /> Send nudge
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback panel */}
              {camp.stats.avgFeedback && (
                <div
                  id={camp.id === "camp1" ? "demo-feedback-panel" : undefined}
                  style={{
                    padding: "1.25rem 1.5rem",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(34,197,94,0.03)",
                  }}
                >
                  <p style={{ margin: "0 0 0.75rem", fontWeight: 600, color: "#f9fafb", fontSize: "0.875rem" }}>
                    Driver feedback ({camp.stats.avgFeedback.count} responses)
                  </p>
                  <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                    {[
                      { label: "Understanding",    value: camp.stats.avgFeedback.understanding },
                      { label: "Enjoyment",        value: camp.stats.avgFeedback.enjoyment },
                      { label: "Want more learning", value: camp.stats.avgFeedback.more_learning },
                    ].map(f => (
                      <div key={f.label}>
                        <p style={{ margin: "0 0 0.25rem", color: "#6b7280", fontSize: "0.75rem" }}>{f.label}</p>
                        <StarRating value={f.value} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tiny Users icon inline (avoids extra import) ─────────────────────────────
function Users({ size, color, style }: { size: number; color: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
