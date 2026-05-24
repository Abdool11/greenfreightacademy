/**
 * GreenFreightAcademy — Pricing Page
 *
 * CTA routing:
 * - "Book for your company" / "Book seats" → logged-in company users go to /dashboard
 *                                           → unauthenticated users go to /register
 * - "Individual enrolment"                 → /contact?type=individual-learner (unchanged)
 * - "Contact us"                           → /contact (unchanged)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";
import { PROGRAMMES } from "@/lib/constants";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pricing | Fleet Training Programmes",
  description:
    "Transparent, adoption-friendly pricing for all Green Freight Academy training programmes. Driver development programmes from R35 per driver per month. Scalable pricing for fleet-wide rollout across South African road freight companies.",
  keywords: [
    "fleet training pricing South Africa",
    "truck driver training cost South Africa",
    "road freight training pricing",
    "fleet development programme cost",
    "driver training per month South Africa",
    "green freight training fees",
  ],
  openGraph: {
    title: "Pricing | Green Freight Academy",
    description:
      "Transparent, scalable pricing for fleet training programmes. Driver development from R35 per driver per month. Built for fleet-wide rollout.",
    url: "https://www.greenfreightacademy.co.za/pricing",
  },
  alternates: {
    canonical: "https://www.greenfreightacademy.co.za/pricing",
  },
};

export default async function PricingPage() {
  const session = await getSession();
  const bookHref = session ? "/dashboard" : "/register";
  const bookLabel = session ? "Go to my dashboard" : "Book for your company";
  const bookSeatsLabel = session ? "Go to my dashboard" : "Book seats";

  const monthlyProgrammes = PROGRAMMES.filter((p) => p.pricingModel === "monthly-per-driver");
  const onceOffProgrammes = PROGRAMMES.filter((p) => p.pricingModel === "once-off" && p.slug !== "green-freight-procurement");

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

      {/* Monthly programmes */}
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
                <h3 style={{ fontSize: "1.125rem", marginBottom: "0.75rem" }}>{prog.title}</h3>
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
                  R35
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
                  <Link href={bookHref} className="btn-primary" style={{ fontSize: "0.875rem" }}>
                    {bookLabel}
                  </Link>
                  <Link href={`/contact?type=individual-learner&programme=${prog.slug}`} className="btn-secondary" style={{ fontSize: "0.875rem" }}>
                    Individual enrolment
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Commitment note */}
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
              <strong style={{ color: "white" }}>Enrolment and cancellation:</strong> An enrolment and setup fee of R75 per candidate (once-off) with the monthly subscription covering coursework and CPD. Initial agreement is 24 months, thereafter month to month. Debit order setup available for company accounts.
            </p>
          </div>
        </div>
      </section>

      {/* Once-off programmes */}
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
                <h4 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{prog.title}</h4>
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
                  <Link href={bookHref} className="btn-secondary" style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}>
                    {bookSeatsLabel}
                  </Link>
                  <Link href={`/programmes#${prog.slug}`} className="btn-ghost" style={{ fontSize: "0.8rem" }}>
                    Programme details
                  </Link>
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
            {session
              ? "Your dashboard is ready. Import your drivers, select a programme, and begin your training campaign."
              : "Register your company to book seats, import your driver list, and begin your training campaign."}
          </p>
          <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={bookHref} className="btn-primary">
              {bookLabel}
              <ArrowRight size={16} />
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
