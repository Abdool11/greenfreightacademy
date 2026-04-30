/**
 * GreenFreightAcademy — Homepage
 *
 * Academy metrics are now fetched live from Supabase via the LiveStats
 * server component with 15-minute ISR revalidation and automatic fallback
 * to DEMO_METRICS if the DB is unreachable.
 *
 * Programme cards: static from lib/constants.ts (PROGRAMMES array)
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Users,
  Briefcase,
  ClipboardList,
  Zap,
  Award,
  RefreshCw,
  TrendingUp,
  Shield,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { PROGRAMMES, CAPABILITY_PILLARS, ECOSYSTEM_URLS } from "@/lib/constants";
import { LiveStats } from "@/components/LiveStats";

export const metadata: Metadata = {
  title: "Green Freight Academy | Specialist Training for Road Freight Companies",
  description:
    "GreenFreightAcademy is South Africa's specialist capability platform for the road freight sector. Practical training, certification, and development programmes for drivers, fleet managers, and transport leaders — built to reduce risk and increase profits.",
  keywords: [
    "green freight academy",
    "truck driver training South Africa",
    "fleet management training South Africa",
    "eco-driving training",
    "road freight training",
    "driver certification South Africa",
    "fleet capability platform",
    "transport manager training",
    "green freight training",
    "professional driver development",
    "road freight South Africa",
    "fleet performance improvement",
    "RTMS training South Africa",
  ],
  openGraph: {
    title: "Green Freight Academy | Specialist Training for Road Freight Companies",
    description:
      "South Africa's specialist capability platform for road freight. Practical training and certification programmes for drivers, fleet managers, and transport leaders.",
    url: "https://www.greenfreightacademy.co.za",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Green Freight Academy — Specialist Training for Road Freight",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Green Freight Academy | Specialist Training for Road Freight Companies",
    description:
      "South Africa's specialist capability platform for road freight. Practical training and certification programmes for drivers, fleet managers, and transport leaders.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://www.greenfreightacademy.co.za",
  },
};

// ─── Section 1: Hero ───────────────────────────────────────────────────────────
async function HeroSection() {
  return (
    <section
      style={{
        position: "relative",
        paddingTop: "9rem",
        paddingBottom: "6rem",
        overflow: "hidden",
        background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 50%, #0a1628 100%)",
      }}
    >
      {/* Background blobs */}
      <div
        className="blob-green"
        style={{ width: "600px", height: "600px", top: "-100px", right: "-100px", opacity: 0.6 }}
      />
      <div
        className="blob-teal"
        style={{ width: "400px", height: "400px", bottom: "0", left: "-80px", opacity: 0.5 }}
      />

      <div className="container-gfa" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "780px" }}>
          {/* Headline */}
          <h1 style={{ marginBottom: "1.5rem" }}>
            Road freight runs on people.{" "}
            <span className="gradient-text">We develop the people who run road freight.</span>
          </h1>

          {/* Supporting text */}
          <p style={{ fontSize: "1.125rem", lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: "2.5rem", maxWidth: "680px" }}>
            Green Freight Academy is South Africa’s specialist capability platform for the road freight sector — providing professional training, certification, and continuous development built by transport experts who understand trucks, drivers, and trucking. We help road freight businesses reduce risk and improve profits through scalable people development.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.875rem", alignItems: "center" }}>
            <Link href="/register" className="btn-primary">
              Book for your company
              <ArrowRight size={16} />
            </Link>
            <Link href="/contact?type=enquiry" className="btn-outline">
              Enquire now
            </Link>
            <Link href="/cpd-bulletins" className="btn-ghost">
              Explore CPD &amp; Driver Bulletins
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Impact strip — live stats from Supabase, 15-min ISR, fallback to DEMO_METRICS */}
        <LiveStats />
      </div>
    </section>
  );
}

// ─── Section 2: The Business Case ─────────────────────────────────────────────
function BusinessCaseSection() {
  return (
    <section className="section-py bg-section-mid">
      <div className="container-gfa">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            alignItems: "center",
          }}
        >
          <div>
            <span className="pill-badge pill-white" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
              The business case
            </span>
            <h2 style={{ marginBottom: "1.25rem" }}>
              Capability is one of the fastest ways to improve freight performance
            </h2>
            <p style={{ marginBottom: "1rem" }}>
              Road freight companies depend on people to turn vehicles, systems, customers, and strategy into
              real-world results. When capability is weak, the business feels it through higher risk, lower
              efficiency, poor discipline, avoidable incidents, weaker service, and lost profit.
            </p>
            <p>
              GFA helps strengthen the human capability that drives safer, smarter, more profitable freight
              operations.
            </p>
          </div>

          {/* Logic flow */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { icon: <Users size={18} />, label: "Stronger capability", color: "#22c55e" },
              { icon: <TrendingUp size={18} />, label: "Greater consistency", color: "#4ade80" },
              { icon: <BarChart3 size={18} />, label: "Better performance", color: "#2dd4bf" },
              { icon: <Shield size={18} />, label: "Reduced risk", color: "#60a5fa" },
              { icon: <Award size={18} />, label: "Improved profitability", color: "#a78bfa" },
            ].map((item, i) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem 1.25rem",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "0.5rem",
                    background: `${item.color}18`,
                    border: `1px solid ${item.color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: item.color,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.9375rem", color: "white" }}>
                  {item.label}
                </span>
                {i < 4 && (
                  <ArrowRight size={14} style={{ marginLeft: "auto", color: "var(--text-muted)" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 3: What GFA Does ─────────────────────────────────────────────────
function CapabilityPillarsSection() {
  const iconMap: Record<string, React.ReactNode> = {
    users: <Users size={22} />,
    briefcase: <Briefcase size={22} />,
    "clipboard-list": <ClipboardList size={22} />,
    zap: <Zap size={22} />,
    award: <Award size={22} />,
    "refresh-cw": <RefreshCw size={22} />,
  };

  const colors = ["#22c55e", "#2dd4bf", "#60a5fa", "#a78bfa", "#f59e0b", "#f87171"];

  return (
    <section className="section-py bg-section-dark">
      <div className="container-gfa">
        <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 3.5rem" }}>
          <span className="pill-badge pill-green" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
            What GFA does
          </span>
          <h2>A practical transformation toolkit for the freight enterprise</h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {CAPABILITY_PILLARS.map((pillar, i) => (
            <div key={pillar.id} className="card-gfa">
              <div
                style={{
                  width: "2.75rem",
                  height: "2.75rem",
                  borderRadius: "0.625rem",
                  background: `${colors[i]}18`,
                  border: `1px solid ${colors[i]}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: colors[i],
                  marginBottom: "1rem",
                }}
              >
                {iconMap[pillar.icon]}
              </div>
              <h4 style={{ marginBottom: "0.5rem" }}>{pillar.title}</h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 4: Programme Architecture ───────────────────────────────────────
function ProgrammeArchitectureSection() {
  const tiers = [
    {
      id: "workforce",
      label: "Tier 1 — Workforce capability",
      programmes: PROGRAMMES.filter((p) => p.tier === "workforce"),
      color: "#22c55e",
    },
    {
      id: "enterprise",
      label: "Tier 2 — Enterprise capability",
      programmes: PROGRAMMES.filter((p) => p.tier === "enterprise"),
      color: "#2dd4bf",
    },
  ];

  return (
    <section className="section-py bg-section-mid">
      <div className="container-gfa">
        <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 3.5rem" }}>
          <span className="pill-badge pill-teal" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
            Our programmes
          </span>
          <h2>Training pathways across the business</h2>
          <p style={{ marginTop: "1rem" }}>
            Programmes covering driver capability and enterprise management, built for practical freight transformation.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {tiers.map((tier) => (
            <div key={tier.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    height: "2px",
                    width: "2rem",
                    background: tier.color,
                    borderRadius: "1px",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: tier.color,
                  }}
                >
                  {tier.label}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "1rem",
                }}
              >
                {tier.programmes.map((prog) => (
                  <div
                    key={prog.id}
                    style={{
                      padding: "1.5rem",
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${tier.color}20`,
                      borderRadius: "0.875rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                      <h4 style={{ fontSize: "1rem", lineHeight: 1.3 }}>{prog.title}</h4>
                      <span
                        style={{
                          padding: "0.25rem 0.625rem",
                          background: `${tier.color}15`,
                          color: tier.color,
                          borderRadius: "0.375rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-display)",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {prog.priceLabel}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                      {prog.shortDescription}
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span className="pill-badge pill-white" style={{ fontSize: "0.7rem" }}>
                        {prog.audienceLabel}
                      </span>
                      <span className="pill-badge pill-white" style={{ fontSize: "0.7rem" }}>
                        {prog.durationLabel}
                      </span>
                    </div>
                    <Link
                      href={`/programmes#${prog.slug}`}
                      className="btn-ghost"
                      style={{ marginTop: "auto", fontSize: "0.8rem" }}
                    >
                      Programme details
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
          <Link href="/programmes" className="btn-secondary">
            View all programmes
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Section 5: Why Companies Use GFA ────────────────────────────────────────
function WhyCompaniesSection() {
  const reasons = [
    { icon: <Users size={18} />, title: "Fleet-wide rollout", body: "Enrol entire driver cohorts at once. Manage seats, track progress, and access reports from one dashboard." },
    { icon: <TrendingUp size={18} />, title: "Adoption-friendly pricing", body: "Driver programmes at R35 per driver per month — designed to remove the cost barrier to fleet-wide capability building." },
    { icon: <BarChart3 size={18} />, title: "Management visibility", body: "Cohort progress, certification status, and CPD completion — all visible to management without chasing individuals." },
    { icon: <RefreshCw size={18} />, title: "Recurring value through CPD", body: "Training does not stop at certification. Quarterly CPD keeps capability current and relevant to real operational conditions." },
    { icon: <ClipboardList size={18} />, title: "Compliance-friendly reporting", body: "Progress and certification reports useful for RTMS, emissions compliance, and internal performance tracking." },
    { icon: <Award size={18} />, title: "Recognised certification", body: "Drivers and staff earn recognised certification that strengthens professional identity and employer confidence." },
  ];

  return (
    <section className="section-py bg-section-dark">
      <div className="container-gfa">
        <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 3.5rem" }}>
          <span className="pill-badge pill-green" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
            Why companies use GFA
          </span>
          <h2>Designed to reduce friction and increase uptake</h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {reasons.map((reason) => (
            <div key={reason.title} className="card-gfa">
              <div
                style={{
                  width: "2.25rem",
                  height: "2.25rem",
                  borderRadius: "0.5rem",
                  background: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-green-400)",
                  marginBottom: "0.875rem",
                }}
              >
                {reason.icon}
              </div>
              <h4 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>{reason.title}</h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{reason.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 6: Pricing Philosophy ───────────────────────────────────────────
function PricingPhilosophySection() {
  return (
    <section className="section-py" style={{ background: "linear-gradient(135deg, rgba(22,163,74,0.08) 0%, rgba(20,184,166,0.05) 100%)" }}>
      <div className="container-gfa">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            alignItems: "center",
          }}
        >
          <div>
            <span className="pill-badge pill-green" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
              Pricing philosophy
            </span>
            <h2 style={{ marginBottom: "1.25rem" }}>Pricing that supports fleet-wide rollout, designed for impact</h2>
            <p style={{ marginBottom: "1rem" }}>
              GFA is designed to remove friction from capability-building at fleet scale. Its pricing philosophy
              supports large-scale uptake, sustained learning, and enterprise-wide transformation rather than
              one-off training events.
            </p>
            <p style={{ color: "var(--color-green-400)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.9375rem" }}>
              The value is not low. The barrier is low.
            </p>
            <div style={{ marginTop: "2rem" }}>
              <Link href="/pricing" className="btn-primary">
                View full pricing
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Pricing table */}
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "1rem",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.5rem",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Programme pricing
              </span>
            </div>
            {PROGRAMMES.map((prog, i) => (
              <div
                key={prog.id}
                style={{
                  padding: "1rem 1.5rem",
                  borderBottom: i < PROGRAMMES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.875rem", color: "white", lineHeight: 1.3 }}>
                    {prog.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    {prog.audienceLabel}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: "var(--color-green-400)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {prog.priceLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 7: Certification and Reporting ───────────────────────────────────
function CertificationSection() {
  return (
    <section className="section-py bg-section-mid">
      <div className="container-gfa">
        <div style={{ textAlign: "center", maxWidth: "620px", margin: "0 auto 3.5rem" }}>
          <span className="pill-badge pill-teal" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
            Certification and reporting
          </span>
          <h2>Training is more valuable when progress is visible</h2>
          <p style={{ marginTop: "1rem" }}>
            GFA helps companies move beyond attendance into structured visibility. Track cohorts, certifications,
            participation, and development progress through reporting features that support management oversight
            and ongoing capability improvement.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {[
            { icon: <CheckCircle2 size={20} />, title: "Completion visibility", body: "See who has completed what, at what stage, and when." },
            { icon: <Award size={20} />, title: "Certification status", body: "Track which employees hold recognised certification across each programme." },
            { icon: <Users size={20} />, title: "Cohort reporting", body: "View progress across your entire enrolled cohort per programme." },
            { icon: <BarChart3 size={20} />, title: "Downloadable reports", body: "Export progress and certification data for RTMS, emissions, and internal compliance reporting." },
          ].map((item) => (
            <div key={item.title} className="card-gfa" style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "0.75rem",
                  background: "rgba(20, 184, 166, 0.1)",
                  border: "1px solid rgba(20, 184, 166, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-teal-400)",
                  margin: "0 auto 1rem",
                }}
              >
                {item.icon}
              </div>
              <h4 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{item.title}</h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 8: CPD as a Live Capability Engine ───────────────────────────────
function CPDSection() {
  return (
    <section className="section-py bg-section-dark">
      <div className="container-gfa">
        <div style={{ maxWidth: "700px", margin: "0 auto 3.5rem", textAlign: "center" }}>
          <span className="pill-badge pill-green" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
            Continuous professional development
          </span>
          <h2>Training starts with certification. Capability is sustained through CPD.</h2>
          <p style={{ marginTop: "1rem" }}>
            This turns training from a once-off event into a live learning and risk-reduction system.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
          }}
        >
          {/* Urgent intervention */}
          <div
            style={{
              padding: "2rem",
              background: "rgba(248, 113, 113, 0.05)",
              border: "1px solid rgba(248, 113, 113, 0.15)",
              borderRadius: "1rem",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.3rem 0.75rem",
                background: "rgba(248, 113, 113, 0.12)",
                color: "#f87171",
                borderRadius: "9999px",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                fontFamily: "var(--font-display)",
                marginBottom: "1.25rem",
              }}
            >
              <Zap size={11} />
              Urgent intervention
            </div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Address a risk now</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
              When a current operational risk, incident pattern, or critical theme needs to be addressed
              immediately — request a priority CPD intervention pushed to your drivers within the month.
              A small additional fee applies.
            </p>
            <Link href="/dashboard/cpd-submission" className="btn-ghost" style={{ marginTop: "1.25rem", color: "#f87171" }}>
              Submit urgent CPD
              <ChevronRight size={13} />
            </Link>
          </div>

          {/* CPD library */}
          <div
            style={{
              padding: "2rem",
              background: "rgba(34, 197, 94, 0.05)",
              border: "1px solid rgba(34, 197, 94, 0.12)",
              borderRadius: "1rem",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.3rem 0.75rem",
                background: "rgba(34, 197, 94, 0.1)",
                color: "var(--color-green-400)",
                borderRadius: "9999px",
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                fontFamily: "var(--font-display)",
                marginBottom: "1.25rem",
              }}
            >
              <RefreshCw size={11} />
              CPD library contribution
            </div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>Contribute to the knowledge base</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
              Share field lessons, recurring risks, incident patterns, or mitigation themes with the wider CPD
              library. Contributions can be shared anonymously or kept confidential — both strengthen the
              relevance of quarterly CPD content for all participants.
            </p>
            <Link href="/dashboard/cpd-submission" className="btn-ghost" style={{ marginTop: "1.25rem" }}>
              Contribute to CPD library
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 9: B2B-first, B2C-lite ──────────────────────────────────────────
function AccessModelSection() {
  return (
    <section className="section-py bg-section-mid">
      <div className="container-gfa">
        <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 3.5rem" }}>
          <span className="pill-badge pill-white" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
            Access model
          </span>
          <h2>Built for companies, flexible for individual learners</h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
          }}
        >
          {/* Company path */}
          <div
            style={{
              padding: "2.5rem",
              background: "rgba(255,255,255,0.04)",
              border: "2px solid rgba(34, 197, 94, 0.2)",
              borderRadius: "1rem",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "-0.75rem",
                left: "1.5rem",
                padding: "0.25rem 0.875rem",
                background: "var(--color-green-500)",
                color: "#0a1628",
                borderRadius: "9999px",
                fontSize: "0.7rem",
                fontWeight: 800,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                fontFamily: "var(--font-display)",
              }}
            >
              Primary — Company path
            </span>
            <h3 style={{ marginBottom: "1.25rem", marginTop: "0.5rem" }}>For companies</h3>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                "Enrol cohorts through a simple dashboard",
                "Manage seats and track individual progress",
                "Access cohort and certification reports",
                "Submit CPD interventions for your drivers",
                "Support enterprise-wide transformation",
              ].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  <CheckCircle2 size={15} style={{ color: "var(--color-green-400)", marginTop: "0.15rem", flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: "1.75rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href="/register" className="btn-primary" style={{ fontSize: "0.875rem", padding: "0.625rem 1.25rem" }}>
                Book for your company
              </Link>
              <Link href="/contact?type=enquiry" className="btn-outline" style={{ fontSize: "0.875rem", padding: "0.625rem 1.25rem" }}>
                Enquire now
              </Link>
            </div>
          </div>

          {/* Individual path */}
          <div
            style={{
              padding: "2.5rem",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "1rem",
            }}
          >
            <h3 style={{ marginBottom: "1.25rem" }}>For individual learners</h3>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                "Browse and enrol in selected programmes",
                "Learn at your own pace",
                "Earn recognised certification",
                "Build your professional profile and CV",
                "Appear in the trained-driver registry",
              ].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  <CheckCircle2 size={15} style={{ color: "var(--color-teal-400)", marginTop: "0.15rem", flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: "1.75rem" }}>
              <Link href={ECOSYSTEM_URLS.betterDriver} className="btn-secondary" style={{ fontSize: "0.875rem", padding: "0.625rem 1.25rem" }}>
                Go to BetterDriver
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 10: Why This Matters ─────────────────────────────────────────────
function WhyItMattersSection() {
  return (
    <section className="section-py bg-section-dark">
      <div className="container-gfa">
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <span className="pill-badge pill-green" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
            Why this matters
          </span>
          <h2 style={{ marginBottom: "1.25rem" }}>When capability improves, the business improves</h2>
          <p style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}>
            Drivers, managers, procurement teams, and transition leaders all influence freight performance.
            Strengthening their capability helps improve efficiency, professionalism, safety, emissions
            performance, and profitability — while reducing repeat mistakes and operational risk.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1rem",
              marginTop: "3rem",
            }}
          >
            {[
              { value: "↓", label: "Operational risk" },
              { value: "↑", label: "Profitability" },
              { value: "↑", label: "Professionalism" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: "1.5rem",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "0.75rem",
                }}
              >
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2.5rem", color: "var(--color-green-400)", lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 11: Connection to BetterDriver ───────────────────────────────────
function BetterDriverConnectionSection() {
  return (
    <section
      className="section-py"
      style={{ background: "linear-gradient(135deg, rgba(20,184,166,0.06) 0%, rgba(34,197,94,0.04) 100%)" }}
    >
      <div className="container-gfa">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            alignItems: "center",
          }}
        >
          <div>
            <span className="pill-badge pill-teal" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
              Part of a bigger system
            </span>
            <h2 style={{ marginBottom: "1.25rem" }}>Driver development, with a dedicated journey where it matters most</h2>
            <p style={{ marginBottom: "1rem" }}>
              GFA supports enterprise capability across the business. Where a dedicated driver-facing experience
              is needed, BetterDriver provides the optimised learner journey for enrolment, training, certification
              visibility, and professional recognition.
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
              GFA and BetterDriver work together — the company manages from GFA, the driver experiences from
              BetterDriver.
            </p>
            <div style={{ marginTop: "1.75rem" }}>
              <Link href={ECOSYSTEM_URLS.betterDriver} className="btn-secondary">
                Visit BetterDriver
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div
            style={{
              padding: "2rem",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "1rem",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[
                { platform: "TAG", role: "Creates the enabling environment", color: "#60a5fa", href: ECOSYSTEM_URLS.tag },
                { platform: "GFA", role: "Builds enterprise capability", color: "#22c55e", href: "/" },
                { platform: "BetterDriver", role: "Develops the driver asset", color: "#2dd4bf", href: ECOSYSTEM_URLS.betterDriver },
              ].map((item, i) => (
                <div key={item.platform}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "1rem 1.25rem",
                      background: item.platform === "GFA" ? `${item.color}10` : "rgba(255,255,255,0.02)",
                      border: item.platform === "GFA" ? `1px solid ${item.color}25` : "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: "2.25rem",
                        height: "2.25rem",
                        borderRadius: "0.5rem",
                        background: `${item.color}18`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: "0.7rem",
                        color: item.color,
                        flexShrink: 0,
                      }}
                    >
                      {item.platform.slice(0, 3)}
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.875rem", color: "white" }}>
                        {item.platform}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{item.role}</div>
                    </div>
                  </div>
                  {i < 2 && (
                    <div style={{ display: "flex", justifyContent: "center", margin: "0.25rem 0" }}>
                      <ArrowRight size={14} style={{ color: "var(--text-muted)", transform: "rotate(90deg)" }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 12: CTA ──────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section
      className="section-py-lg"
      style={{
        background: "linear-gradient(135deg, #0f1f3d 0%, #0a1628 100%)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="container-gfa" style={{ textAlign: "center" }}>
        <h2 style={{ maxWidth: "640px", margin: "0 auto 1.25rem" }}>
          Get Started — Build capability across your freight business
        </h2>
        <p style={{ maxWidth: "580px", margin: "0 auto 2.5rem", fontSize: "1.0625rem" }}>
          Whether you are strengthening driver professionalism, improving management capability, or building greener freight understanding, GFA provides a practical platform for scalable progress.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.875rem", justifyContent: "center" }}>
          <Link href="/contact?type=fleet-company" className="btn-primary">
            JOIN NOW
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Page Export ─────────// ─── Section: Closing the Loop on Driver Risk ──────────────────────────────────────────────────
function ClosingTheLoopSection() {
  return (
    <section className="section-py" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(34,197,94,0.04) 100%)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="container-gfa">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center" }}>
          <div>
            <span className="pill-badge pill-yellow" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
              Driver risk management
            </span>
            <h2 style={{ marginBottom: "1.25rem" }}>Closing the Loop on Driver Risk</h2>
            <p style={{ marginBottom: "1rem", lineHeight: 1.7 }}>
              Most driver risk interventions stop at training. GFA closes the loop by connecting certification,
              ongoing CPD, and real-time driver bulletins into a single, trackable system.
            </p>
            <p style={{ marginBottom: "1.5rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
              When a risk event happens on your fleet, you can push an urgent bulletin directly to your drivers
              within hours — not weeks. Drivers acknowledge it, you see who has read it, and the incident is
              documented. That’s a closed loop.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              <Link href="/cpd-bulletins" className="btn-primary">
                Explore CPD &amp; Bulletins
                <ArrowRight size={15} />
              </Link>
              <Link href="/register" className="btn-outline">
                Get started
              </Link>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { icon: <Zap size={18} />, color: "#f59e0b", title: "Urgent driver bulletins", body: "Push a risk alert to your entire fleet within hours. Drivers acknowledge on their phones." },
              { icon: <CheckCircle2 size={18} />, color: "#22c55e", title: "Acknowledgement tracking", body: "See exactly who has read and acknowledged each bulletin. Full audit trail for compliance." },
              { icon: <RefreshCw size={18} />, color: "#3b82f6", title: "Quarterly CPD integration", body: "Field lessons and risk patterns feed into the quarterly CPD bulletin for all certified drivers." },
              { icon: <Shield size={18} />, color: "#8b5cf6", title: "Documented risk closure", body: "Every bulletin creates a timestamped record of your risk response — valuable for audits and insurance." },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "1rem", padding: "1rem 1.25rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.75rem" }}>
                <div style={{ color: item.color, flexShrink: 0, marginTop: "0.125rem" }}>{item.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9375rem", marginBottom: "0.25rem" }}>{item.title}</div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{item.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page Export ──────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ProgrammeArchitectureSection />
      <ClosingTheLoopSection />
      <CPDSection />
      <CTASection />
    </>
  );
}