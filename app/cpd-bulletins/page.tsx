import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, RefreshCw, Bell, BookOpen, Shield, TrendingUp, CheckCircle2, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "CPD & Driver Bulletins | GreenFreightAcademy",
  description:
    "GreenFreightAcademy extends capability development beyond once-off training through structured CPD and driver bulletins — closing the loop from incident to reduced risk.",
};

const CPD_FEATURES = [
  {
    icon: BookOpen,
    title: "Core programme first",
    body: "Drivers complete their core training and certification before entering the CPD pathway.",
  },
  {
    icon: RefreshCw,
    title: "Quarterly CPD modules",
    body: "One structured refresh module every three months, reinforcing practical knowledge and professional standards.",
  },
  {
    icon: TrendingUp,
    title: "Ongoing visibility",
    body: "Companies gain clear visibility into refresh participation and completion across the workforce.",
  },
  {
    icon: CheckCircle2,
    title: "Annual reporting",
    body: "Annual training refresh records support RTMS reviews, ESG reporting, and governance requirements.",
  },
];

const BULLETIN_USES = [
  "Safety alerts",
  "Quality notices",
  "Process updates",
  "Operational reminders",
  "Incident-related lessons",
  "Urgent areas of driver awareness",
];

const COMPANY_BENEFITS = [
  "Maintain driver capability over time",
  "Reinforce professionalism and standards",
  "Respond to incidents with structured learning",
  "Improve visibility of ongoing development",
  "Strengthen internal governance and learning discipline",
  "Support ESG-related people development objectives",
  "Support RTMS-related annual review and training processes",
];

export default function CPDBulletinsPage() {
  return (
    <main style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* Hero */}
      <section
        style={{
          padding: "6rem 0 4rem",
          background: "linear-gradient(180deg, rgba(16,185,129,0.06) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="container">
          <div style={{ maxWidth: "760px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: "2rem",
                padding: "0.375rem 0.875rem",
                marginBottom: "1.5rem",
              }}
            >
              <RefreshCw size={14} color="#10b981" />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#10b981" }}>
                First in market
              </span>
            </div>
            <h1 style={{ color: "var(--text-primary)", marginBottom: "1.25rem" }}>
              CPD &amp; Driver Bulletins
            </h1>
            <p
              style={{
                fontSize: "1.125rem",
                lineHeight: 1.75,
                color: "var(--text-secondary)",
                marginBottom: "1rem",
              }}
            >
              GreenFreightAcademy extends capability development beyond once-off training through structured
              continuous professional development and timely driver bulletins that keep learning active,
              relevant, and operationally connected.
            </p>
            <p style={{ fontSize: "1rem", lineHeight: 1.75, color: "var(--text-secondary)" }}>
              This creates a stronger model for driver development by combining scheduled refresh learning
              with real-world safety, quality, and incident-based communication.
            </p>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "4rem 0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4rem" }}>

          {/* Beyond Once-Off Training */}
          <section>
            <h2 style={{ color: "var(--text-primary)", marginBottom: "1rem" }}>Beyond Once-Off Training</h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, maxWidth: "720px", marginBottom: "1.5rem" }}>
              Training creates more value when it continues beyond initial completion. GreenFreightAcademy is
              designed to support an ongoing development pathway in which drivers complete core training and
              certification, then continue to receive structured refresh learning over time.
            </p>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, maxWidth: "720px" }}>
              This helps turn training from a once-off event into a managed and continuous development process.
            </p>
          </section>

          {/* Structured CPD */}
          <section>
            <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              Structured Continuous Professional Development
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, maxWidth: "720px", marginBottom: "2rem" }}>
              The CPD model is designed to keep driver capability current and visible.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {CPD_FEATURES.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="card"
                  style={{ padding: "1.5rem" }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      background: "rgba(16,185,129,0.12)",
                      borderRadius: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <Icon size={20} color="#10b981" />
                  </div>
                  <h3 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    {title}
                  </h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Driver Bulletins */}
          <section>
            <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              Driver Bulletins That Keep Learning Alive
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, maxWidth: "720px", marginBottom: "1.5rem" }}>
              GreenFreightAcademy supports a powerful driver bulletin function that helps companies communicate
              important updates directly into the driver learning environment. This gives companies a structured
              way to keep important messages active and visible, rather than allowing them to disappear into
              informal communication channels.
            </p>
            <div
              className="card"
              style={{ padding: "1.5rem 2rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <Bell size={20} color="#f59e0b" />
                <h3 style={{ color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                  Bulletins can be used for:
                </h3>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.625rem" }}>
                {BULLETIN_USES.map((item) => (
                  <li key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Incident to Institutional Learning */}
          <section>
            <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              From Incident to Institutional Learning
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, maxWidth: "720px", marginBottom: "1.5rem" }}>
              One of the strongest features of this model is the ability to turn incidents and operational issues
              into learning. Through the company-facing portal, a client can log an incident or issue and define
              what happened, what was learned, what drivers need to know, and whether an urgent refresh is needed.
            </p>
            <div
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.08))",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: "1rem",
                padding: "1.75rem 2rem",
              }}
            >
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                This allows the platform to support a much stronger feedback loop:
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontWeight: 700,
                  fontSize: "0.9375rem",
                }}
              >
                {["Identify the issue", "Communicate the lesson", "Reinforce the mitigation", "Track driver response", "Reduce repeat risk"].map((step, i, arr) => (
                  <>
                    <span key={step} style={{ color: "#10b981" }}>{step}</span>
                    {i < arr.length - 1 && <span style={{ color: "#6b7280" }}>→</span>}
                  </>
                ))}
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "1rem", fontStyle: "italic" }}>
                That is how institutional knowledge becomes embedded rather than forgotten.
              </p>
            </div>
          </section>

          {/* Urgent Refresh */}
          <section>
            <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              Urgent Refresh for Immediate Risk Response
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, maxWidth: "720px", marginBottom: "1.5rem" }}>
              Where needed, companies can request urgent refresh content for their own drivers. This allows a
              company to respond quickly when a safety issue occurs, a recurring operational mistake is identified,
              a quality risk needs immediate reinforcement, or drivers need urgent awareness on a specific issue.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: "0.875rem",
                padding: "1.25rem 1.5rem",
                maxWidth: "600px",
              }}
            >
              <Zap size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: "0.125rem" }} />
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.65, margin: 0 }}>
                This makes the academy more responsive and more useful in live operational environments — turning
                the platform into an active risk management tool, not just a training catalogue.
              </p>
            </div>
          </section>

          {/* Why This Matters */}
          <section>
            <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              Why This Matters for Companies
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, maxWidth: "720px", marginBottom: "1.5rem" }}>
              This model creates value well beyond course delivery. Instead of training ending at certification,
              the company gains an ongoing capability system.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {COMPANY_BENEFITS.map((benefit) => (
                <li key={benefit} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
                  <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: "0.2rem" }} />
                  {benefit}
                </li>
              ))}
            </ul>
          </section>

          {/* CTA */}
          <section
            style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.06))",
              border: "1px solid rgba(16,185,129,0.15)",
              borderRadius: "1.25rem",
              padding: "3rem 2.5rem",
              textAlign: "center",
            }}
          >
            <Shield size={36} color="#10b981" style={{ marginBottom: "1.25rem" }} />
            <h2 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>
              Work With GreenFreightAcademy
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, maxWidth: "560px", margin: "0 auto 2rem" }}>
              If you want to build a more structured, more responsive, and more valuable driver development
              system, GreenFreightAcademy is designed to help.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.875rem", justifyContent: "center" }}>
              <Link href="/contact?type=consultation" className="btn-primary">
                Book a Consultation
                <ArrowRight size={16} />
              </Link>
              <Link href="/contact?type=cpd" className="btn-outline">
                Discuss CPD &amp; Driver Bulletins
              </Link>
              <Link href="/login" className="btn-secondary">
                Client Login
              </Link>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
