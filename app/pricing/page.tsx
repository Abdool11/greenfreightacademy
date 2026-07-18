"use client";

/**
 * GreenFreightAcademy — Pricing Page
 * All prices are driven by PROGRAMMES in @/lib/constants.ts — no hardcoded values.
 */

import Link from "next/link";
import { ArrowRight, CheckCircle2, Info, Play } from "lucide-react";
import { PROGRAMMES } from "@/lib/constants";

export default function PricingPage() {
  const bookHref = "/register";
  const bookLabel = "Book for your company";
  const bookSeatsLabel = "Book seats";

  // Single source of truth: all data comes from PROGRAMMES in constants.ts
  const monthlyProgrammes = PROGRAMMES.filter(
    (p) => p.pricingModel === "monthly-per-driver"
  );
  const onceOffProgrammes = PROGRAMMES.filter(
    (p) => p.pricingModel === "once-off" && p.slug !== "green-freight-procurement"
  );

  // Derive the enrolment fee from constants (R75 per candidate setup fee — same as monthly price)
  const enrolmentFee = monthlyProgrammes[0]?.price ?? 75;

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      {/* Header */}
      <section
        style={{
          padding: "5rem 0 4rem",
          background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container-gfa" style={{ textAlign: "center" }}>
          <h1 style={{ maxWidth: "600px", margin: "0 auto 1.25rem" }}>
            Pricing that supports fleet-wide rollout
          </h1>
          <p style={{ maxWidth: "600px", margin: "0 auto 1rem", fontSize: "1.0625rem", color: "var(--text-secondary)" }}>
            GreenFreightAcademy is priced to make structured capability development easier to deploy across your
            entire fleet — not just a pilot group. Our pricing model is designed to scale with your business,
            so the cost of developing your people stays manageable as your fleet grows.
          </p>
          <p style={{ maxWidth: "560px", margin: "0 auto", fontSize: "0.9375rem", color: "var(--text-muted)" }}>
            The value is not low. The barrier is low.
          </p>
        </div>
      </section>

      {/* Monthly driver programmes */}
      <section style={{ padding: "4rem 0", background: "var(--color-slate-900)" }}>
        <div className="container-gfa">
          <div style={{ marginBottom: "2.5rem" }}>
            <h2>Driver development programmes</h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {monthlyProgrammes.map((prog) => (
              <div
                key={prog.id}
                style={{
                  padding: "2rem",
                  background: "rgba(34, 197, 94, 0.04)",
                  border: "1px solid rgba(34, 197, 94, 0.15)",
                  borderRadius: "1rem",
                }}
              >
                {!prog.available && (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.2rem 0.6rem",
                      background: "rgba(245,158,11,0.12)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      borderRadius: "9999px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-display)",
                      color: "#f59e0b",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                    Coming Soon
                  </span>
                </div>
              )}
              <h3 style={{ fontSize: "1.125rem", marginBottom: "0.75rem" }}>{prog.title}</h3>
                {/* Price rendered from constants — no hardcoded value */}
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: "2.25rem",
                    color: "var(--color-green-400)",
                    lineHeight: 1,
                    marginBottom: "0.25rem",
                  }}
                >
                  R{prog.price}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                  per driver per month
                </div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.75rem" }}>
                  {[
                    "Full training programme",
                    "Evaluation and assessment",
                    "Recognised certification",
                    "Quarterly CPD included",
                    "Progress reporting for management",
                    "Useful for RTMS and compliance",
                  ].map((item) => (
                    <li
                      key={item}
                      style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}
                    >
                      <CheckCircle2 size={14} style={{ color: "var(--color-green-400)", marginTop: "0.2rem", flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  {prog.available ? (
                    <>
                      <Link href={bookHref} className="btn-primary" style={{ fontSize: "0.875rem" }}>
                        {bookLabel}
                      </Link>
                      <Link href={`/contact?type=individual-learner&programme=${prog.slug}`} className="btn-secondary" style={{ fontSize: "0.875rem" }}>
                        Individual enrolment
                      </Link>
                    </>
                  ) : (
                    <span
                      className="btn-primary"
                      aria-disabled="true"
                      style={{
                        fontSize: "0.875rem",
                        opacity: 0.5,
                        cursor: "not-allowed",
                        pointerEvents: "none",
                      }}
                    >
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Commitment note — enrolment fee derived from constants */}
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem 1.25rem",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "0.75rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <Info size={16} style={{ color: "var(--color-green-400)", marginTop: "0.15rem", flexShrink: 0 }} />
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              <strong style={{ color: "white" }}>Enrolment and cancellation:</strong> An enrolment and setup fee of R{enrolmentFee} per candidate (once-off) with the monthly subscription covering coursework and CPD. Initial agreement is 24 months, thereafter month to month. Debit order setup available for company accounts.
            </p>
          </div>
        </div>
      </section>

      {/* Once-off management/transition programmes */}
      <section style={{ padding: "4rem 0", background: "var(--bg-section-mid)" }}>
        <div className="container-gfa">
          <div style={{ marginBottom: "2.5rem" }}>
            <h2>Management, procurement, and transition programmes</h2>
            <p style={{ marginTop: "0.75rem", maxWidth: "560px", color: "var(--text-secondary)" }}>
              Structured programmes for managers, procurement teams, and transition leaders. Payment on enrolment.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {onceOffProgrammes.map((prog) => (
              <div
                key={prog.id}
                style={{
                  padding: "1.75rem",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "1rem",
                }}
              >
                {!prog.available && (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.2rem 0.6rem",
                      background: "rgba(245,158,11,0.12)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      borderRadius: "9999px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-display)",
                      color: "#f59e0b",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                    Coming Soon
                  </span>
                </div>
              )}
              <h4 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{prog.title}</h4>
                {/* Price from constants */}
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: "1.75rem",
                    color: "var(--color-teal-400)",
                    lineHeight: 1,
                    marginBottom: "0.25rem",
                  }}
                >
                  {prog.priceLabel}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                  {prog.audienceLabel} · {prog.durationLabel}
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
                  {prog.shortDescription}
                </p>
                <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
                  {prog.available ? (
                    <>
                      <Link href={bookHref} className="btn-secondary" style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}>
                        {bookSeatsLabel}
                      </Link>
                      <Link href={`/programmes#${prog.slug}`} className="btn-ghost" style={{ fontSize: "0.8rem" }}>
                        Programme details
                      </Link>
                    </>
                  ) : (
                    <span
                      className="btn-secondary"
                      aria-disabled="true"
                      style={{
                        fontSize: "0.8rem",
                        padding: "0.5rem 1rem",
                        opacity: 0.5,
                        cursor: "not-allowed",
                        pointerEvents: "none",
                      }}
                    >
                      Coming Soon
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA */}
      <section
        style={{
          padding: "5rem 0",
          background: "linear-gradient(135deg, #0f1f3d 0%, #0a1628 100%)",
          borderTop: "1px solid var(--border-subtle)",
          textAlign: "center",
        }}
      >
        <div className="container-gfa">
          <h2 style={{ maxWidth: "560px", margin: "0 auto 1.25rem" }}>
            Ready to get started?
          </h2>
          <p style={{ maxWidth: "500px", margin: "0 auto 2.5rem", color: "var(--text-secondary)" }}>
            Register your company to book seats, import your driver list, and begin your training campaign.
          </p>
          <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={bookHref} className="btn-primary">
              {bookLabel}
              <ArrowRight size={16} />
            </Link>
            <Link href="/demo" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Play size={15} /> Take a guided tour
            </Link>
            <Link href="/contact" className="btn-secondary">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
