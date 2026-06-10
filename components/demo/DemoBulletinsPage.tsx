"use client";

import { AlertTriangle, BookOpen, CheckCircle2, Clock } from "lucide-react";
import { DEMO_BULLETINS } from "@/lib/demo-data";

const CATEGORY_LABELS: Record<string, string> = {
  safety: "Safety", operational: "Operational", quality: "Quality",
  process: "Process", compliance: "Compliance", behaviour: "Behaviour / Conduct", other: "Other",
};

export default function DemoBulletinsPage() {
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
            Driver Bulletins
          </span>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.75rem", fontWeight: 800, color: "#f9fafb" }}>
            Issue a driver bulletin
          </h1>
          <p style={{ margin: 0, color: "#6b7280", maxWidth: "520px" }}>
            Push structured safety, operational, or CPD messages directly to your drivers on the BetterDriver portal.
          </p>
        </div>
      </section>

      <div className="container-gfa" style={{ padding: "2.5rem 0 6rem" }}>

        {/* New bulletin form */}
        <div
          id="demo-bulletin-form"
          style={{
            background: "#0d1520", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "0.875rem", padding: "1.5rem", marginBottom: "2rem",
          }}
        >
          <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700, color: "#f9fafb" }}>
            New bulletin
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            {[
              { label: "Title", placeholder: "e.g. Tyre Blowout at High Speed" },
              { label: "Category", placeholder: "Safety" },
              { label: "Date observed", placeholder: "2026-05-14" },
              { label: "Audience", placeholder: "All drivers" },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: "block", color: "#9ca3af", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                  {f.label}
                </label>
                <div style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "0.5rem", padding: "0.625rem 0.875rem",
                  color: "#6b7280", fontSize: "0.875rem",
                }}>
                  {f.placeholder}
                </div>
              </div>
            ))}
          </div>
          {["Description", "Why it matters", "Mitigation message", "Driver action"].map(f => (
            <div key={f} style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", color: "#9ca3af", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                {f}
              </label>
              <div style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "0.5rem", padding: "0.625rem 0.875rem",
                color: "#6b7280", fontSize: "0.875rem", minHeight: "60px",
              }} />
            </div>
          ))}

          {/* Urgency selector */}
          <div
            id="demo-bulletin-urgency"
            style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "1rem",
            }}
          >
            <p style={{ margin: "0 0 0.75rem", fontWeight: 600, color: "#f9fafb", fontSize: "0.9375rem" }}>
              Urgency &amp; confidentiality
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{
                flex: 1, minWidth: "200px",
                border: "2px solid rgba(59,130,246,0.4)", borderRadius: "0.75rem",
                padding: "1rem", background: "rgba(59,130,246,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                  <BookOpen size={15} color="#60a5fa" />
                  <span style={{ fontWeight: 700, color: "#60a5fa", fontSize: "0.875rem" }}>Standard</span>
                </div>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "0.8125rem" }}>
                  Shared with the GFA CPD community library. No additional fee.
                </p>
              </div>
              <div style={{
                flex: 1, minWidth: "200px",
                border: "2px solid rgba(239,68,68,0.4)", borderRadius: "0.75rem",
                padding: "1rem", background: "rgba(239,68,68,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                  <AlertTriangle size={15} color="#f87171" />
                  <span style={{ fontWeight: 700, color: "#f87171", fontSize: "0.875rem" }}>Urgent</span>
                </div>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "0.8125rem" }}>
                  Confidential to your company. Once-off fee applies. Pay by card or invoice.
                </p>
              </div>
            </div>
          </div>

          <span style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "0.5rem", padding: "0.625rem 1.5rem",
            color: "#22c55e", fontWeight: 700, fontSize: "0.875rem", cursor: "default",
          }}>
            Submit bulletin →
          </span>
        </div>

        {/* Bulletin history */}
        <div id="demo-bulletin-history">
          <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#f9fafb" }}>
            Recent bulletins
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {DEMO_BULLETINS.map(b => (
              <div key={b.id} style={{
                background: "#0d1520", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "0.875rem", padding: "1.25rem 1.5rem",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{
                        background: b.urgency === "urgent" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)",
                        border: `1px solid ${b.urgency === "urgent" ? "rgba(239,68,68,0.25)" : "rgba(59,130,246,0.25)"}`,
                        borderRadius: "9999px", padding: "0.125rem 0.5rem",
                        color: b.urgency === "urgent" ? "#f87171" : "#60a5fa",
                        fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase",
                      }}>
                        {b.urgency}
                      </span>
                      <span style={{
                        background: "rgba(255,255,255,0.05)", borderRadius: "9999px",
                        padding: "0.125rem 0.5rem", color: "#9ca3af", fontSize: "0.6875rem",
                      }}>
                        {CATEGORY_LABELS[b.category] ?? b.category}
                      </span>
                      {b.confidential && (
                        <span style={{
                          background: "rgba(245,158,11,0.08)", borderRadius: "9999px",
                          padding: "0.125rem 0.5rem", color: "#f59e0b", fontSize: "0.6875rem",
                        }}>
                          Confidential
                        </span>
                      )}
                    </div>
                    <h4 style={{ margin: "0 0 0.375rem", fontSize: "0.9375rem", fontWeight: 700, color: "#f9fafb" }}>
                      {b.title}
                    </h4>
                    <p style={{ margin: "0 0 0.75rem", color: "#6b7280", fontSize: "0.8125rem", lineHeight: 1.5 }}>
                      {b.description.slice(0, 180)}…
                    </p>
                    <div style={{
                      background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
                      borderRadius: "0.5rem", padding: "0.625rem 0.875rem",
                    }}>
                      <p style={{ margin: 0, color: "#4ade80", fontSize: "0.8125rem", fontWeight: 600 }}>
                        Driver action:
                      </p>
                      <p style={{ margin: "0.25rem 0 0", color: "#9ca3af", fontSize: "0.8125rem" }}>
                        {b.driver_action}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: "120px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "0.375rem",
                      background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
                      borderRadius: "9999px", padding: "0.125rem 0.625rem",
                      color: "#22c55e", fontSize: "0.75rem", fontWeight: 600,
                    }}>
                      <CheckCircle2 size={11} /> Published
                    </span>
                    <p style={{ margin: "0.5rem 0 0", color: "#6b7280", fontSize: "0.75rem" }}>
                      {new Date(b.submitted_at).toLocaleDateString("en-ZA")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
