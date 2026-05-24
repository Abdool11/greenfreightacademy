/**
 * GreenFreightAcademy — Career Path Planner
 *
 * DATA REQUIREMENTS:
 * - Career pathway data: static from lib/constants.ts (CAREER_PATHWAYS)
 * - Programme data: static from lib/constants.ts (PROGRAMMES)
 * - No API calls required for this page — all data is static
 * - Enrolment CTA links to /contact?type=fleet-company or /dashboard (for authenticated users)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Star } from "lucide-react";
import { CAREER_PATHWAYS, PROGRAMMES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Career Path Planner",
  description:
    "Map your team's roles to the right GreenFreightAcademy programmes. Build a structured development plan across your entire organisation.",
};

const ROLE_COLORS: Record<string, string> = {
  driver: "#22c55e",
  manager: "#2dd4bf",
  procurement: "#60a5fa",
  "transition-leader": "#a78bfa",
  "all-staff": "#f59e0b",
};

export default function CareerPlannerPage() {
  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      {/* Header */}
      <section
        style={{
          padding: "3.5rem 0 3rem",
          background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container-gfa">
          <Link
            href="/dashboard"
            style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.375rem", marginBottom: "1.5rem" }}
          >
            ← Back to dashboard
          </Link>
          <span className="pill-badge pill-green" style={{ marginBottom: "1rem", display: "inline-flex" }}>
            Career path planner
          </span>
          <h1 style={{ fontSize: "1.75rem", maxWidth: "600px", marginBottom: "0.75rem" }}>
            Map your team to the right programmes
          </h1>
          <p style={{ maxWidth: "540px", color: "var(--text-secondary)" }}>
            Use this planner to identify which programmes are recommended for each role in your organisation.
            Select a role to see the recommended pathway, then enrol your team.
          </p>
        </div>
      </section>

      {/* Pathways */}
      <section style={{ padding: "3.5rem 0" }}>
        <div className="container-gfa">
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {CAREER_PATHWAYS.map((pathway) => {
              const color = ROLE_COLORS[pathway.roleType] ?? "#22c55e";
              const recommended = PROGRAMMES.filter((p) => pathway.recommendedProgrammes.includes(p.id));
              const optional = PROGRAMMES.filter((p) => pathway.optionalProgrammes.includes(p.id));

              return (
                <div
                  key={pathway.roleType}
                  style={{
                    padding: "2rem",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${color}18`,
                    borderRadius: "1rem",
                  }}
                >
                  {/* Role header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                    <div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          padding: "0.25rem 0.75rem",
                          background: `${color}15`,
                          color: color,
                          borderRadius: "9999px",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          fontFamily: "var(--font-display)",
                          marginBottom: "0.75rem",
                        }}
                      >
                        {pathway.roleLabel}
                      </div>
                      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "480px" }}>
                        {pathway.description}
                      </p>
                    </div>
                    <Link
                      href={`/contact?type=fleet-company`}
                      className="btn-secondary"
                      style={{ fontSize: "0.8rem", padding: "0.5rem 1rem", flexShrink: 0 }}
                    >
                      Enrol this cohort
                      <ArrowRight size={13} />
                    </Link>
                  </div>

                  {/* Recommended */}
                  {recommended.length > 0 && (
                    <div style={{ marginBottom: "1.25rem" }}>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          color: color,
                          marginBottom: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                        }}
                      >
                        <Star size={11} />
                        Recommended
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                        {recommended.map((prog) => (
                          <div
                            key={prog.id}
                            style={{
                              padding: "0.75rem 1rem",
                              background: `${color}08`,
                              border: `1px solid ${color}20`,
                              borderRadius: "0.625rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <CheckCircle2 size={13} style={{ color, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: "0.875rem", fontFamily: "var(--font-display)", fontWeight: 600, color: "white" }}>
                                {prog.title}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {prog.priceLabel} · {prog.durationLabel}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Optional */}
                  {optional.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          color: "var(--text-muted)",
                          marginBottom: "0.75rem",
                        }}
                      >
                        Also consider
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}>
                        {optional.map((prog) => (
                          <div
                            key={prog.id}
                            style={{
                              padding: "0.5rem 0.875rem",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: "0.5rem",
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            {prog.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: "4rem 0",
          background: "linear-gradient(135deg, #0f1f3d 0%, #0a1628 100%)",
          borderTop: "1px solid var(--border-subtle)",
          textAlign: "center",
        }}
      >
        <div className="container-gfa">
          <h2 style={{ maxWidth: "480px", margin: "0 auto 1.25rem", fontSize: "1.5rem" }}>
            Ready to build your development plan?
          </h2>
          <p style={{ maxWidth: "440px", margin: "0 auto 2rem", color: "var(--text-secondary)" }}>
            Contact us to discuss the right programme mix for your team, or go straight to the enrolment grid.
          </p>
          <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/contact?type=fleet-company" className="btn-primary">
              Discuss with us
              <ArrowRight size={16} />
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              Go to enrolment grid
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
