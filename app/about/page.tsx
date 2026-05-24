/**
 * GreenFreightAcademy — About GreenFreightAcademy
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About GreenFreightAcademy",
  description:
    "GreenFreightAcademy is a training and capability platform built for the road freight sector. It helps organisations deploy structured training campaigns, monitor progress, maintain driver records, and build continuous professional development over time.",
};

export default function Page() {
  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>

      {/* Hero */}
      <section
        style={{
          padding: "5rem 0 4rem",
          background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container-gfa">
          {/* Branded heading: "About" + GFA logo badge — matches nav bar identity */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.25rem",
              flexWrap: "wrap",
              marginBottom: "1.5rem",
            }}
          >
            <h1
              style={{
                fontSize: "clamp(2.5rem, 6vw, 4rem)",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                color: "white",
                lineHeight: 1,
                margin: 0,
              }}
            >
              About
            </h1>
            {/* GFA logo badge — same as navigation bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "3.25rem",
                  height: "3.25rem",
                  background: "linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)",
                  borderRadius: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "1.2rem",
                  color: "#0a1628",
                  flexShrink: 0,
                  boxShadow: "0 4px 20px rgba(34,197,94,0.25)",
                }}
              >
                GFA
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: "1.25rem",
                    color: "white",
                    letterSpacing: "-0.01em",
                  }}
                >
                  GreenFreight
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "1.1rem",
                    color: "#22c55e",
                    letterSpacing: "0.01em",
                  }}
                >
                  Academy
                </span>
              </div>
            </div>
          </div>
          <p style={{ maxWidth: "560px", color: "var(--text-secondary)", fontSize: "1.125rem", lineHeight: 1.7 }}>
            GreenFreightAcademy is a company-facing training and capability platform built specifically for the road
            freight sector. We are a specialist capability platform — not a generic e-learning provider — built by
            transport experts who understand trucks, drivers, and trucking.
          </p>
          <p style={{ maxWidth: "560px", color: "var(--text-muted)", marginTop: "1rem", lineHeight: 1.7 }}>
            We help road freight businesses reduce risk and improve profits through scalable people development:
            structured training campaigns, driver certification, continuous CPD, and real-time driver bulletins —
            all in one platform designed to make capability visible, manageable, and measurable.
          </p>
        </div>
      </section>

      {/* Why GFA Exists */}
      <section style={{ padding: "4.5rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container-gfa" style={{ maxWidth: "800px" }}>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "1.25rem" }}>
            Why GreenFreightAcademy Exists
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "1rem" }}>
            Road freight performance depends on people. Drivers, managers, and operators need practical capability
            if safety, professionalism, fuel efficiency, emissions performance, and operational discipline are to
            improve.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75 }}>
            GreenFreightAcademy exists to help companies build that capability with structure. It gives organisations
            a stronger way to roll out training, track progress, maintain records, and reinforce learning over time.
          </p>
        </div>
      </section>

      {/* Built for the Road Freight Sector */}
      <section
        style={{
          padding: "4.5rem 0",
          background: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container-gfa" style={{ maxWidth: "800px" }}>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "1.25rem" }}>
            Built for the Road Freight Sector
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "1rem" }}>
            GreenFreightAcademy is built specifically for freight operations. Its programmes reflect the real
            demands of the sector, including driver professionalism, eco-driving, safety, transport management,
            emissions reduction, telematics, and transition readiness.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75 }}>
            This sector focus matters. Capability development in freight must connect to operational reality,
            management discipline, and measurable performance improvement.
          </p>
        </div>
      </section>

      {/* A Stronger Approach */}
      <section style={{ padding: "4.5rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container-gfa" style={{ maxWidth: "800px" }}>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "1.25rem" }}>
            A Stronger Approach to Capability Development
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "1.5rem" }}>
            GreenFreightAcademy supports more than course completion. It helps companies manage training as a
            practical part of performance, professionalism, and organisational development.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            The platform is designed to support
          </p>
          <ul
            style={{
              listStyle: "none",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            {[
              "Structured training campaigns",
              "Learner progress visibility",
              "Trained-driver records",
              "Certification oversight",
              "Continuous professional development",
              "Stronger reporting and management visibility",
            ].map((item) => (
              <li
                key={item}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.625rem",
                  color: "var(--text-secondary)",
                  fontSize: "0.9375rem",
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    width: "1.25rem",
                    height: "1.25rem",
                    borderRadius: "50%",
                    background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "0.125rem",
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.5 6L6.5 2" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            This gives companies a more disciplined and useful training system.
          </p>
        </div>
      </section>

      {/* Beyond Once-Off Training */}
      <section
        style={{
          padding: "4.5rem 0",
          background: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container-gfa" style={{ maxWidth: "800px" }}>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "1.25rem" }}>
            Beyond Once-Off Training
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "1.5rem" }}>
            GreenFreightAcademy is designed to support ongoing development, not only one-time certification.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "1.5rem" }}>
            For companies that opt in, the platform can support a continuous professional development pathway with:
          </p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.5rem" }}>
            {[
              "Core training and certification",
              "Quarterly refresh modules",
              "Annual refresh records",
              "Ongoing visibility of development progress",
            ].map((item) => (
              <li
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  color: "var(--text-secondary)",
                  fontSize: "0.9375rem",
                }}
              >
                <span style={{ width: "0.375rem", height: "0.375rem", borderRadius: "50%", background: "var(--color-teal-400)", flexShrink: 0 }} />
                {item}
              </li>
            ))}
          </ul>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            This helps turn training into a sustained capability system rather than a once-off event.
          </p>
        </div>
      </section>

      {/* Reporting, Records, and Visibility */}
      <section style={{ padding: "4.5rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container-gfa" style={{ maxWidth: "800px" }}>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "1.25rem" }}>
            Reporting, Records, and Visibility
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "1.5rem" }}>
            Training creates more value when companies can clearly see what is happening.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: "1.5rem" }}>
            GreenFreightAcademy is designed to give organisations visibility into:
          </p>
          <ul
            style={{
              listStyle: "none",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            {[
              "Campaign rollout",
              "Learner progress",
              "Completion status",
              "Certification outcomes",
              "Annual refresh activity",
              "Driver training registers",
            ].map((item) => (
              <li
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  color: "var(--text-secondary)",
                  fontSize: "0.9375rem",
                }}
              >
                <span style={{ width: "0.375rem", height: "0.375rem", borderRadius: "50%", background: "var(--color-green-400)", flexShrink: 0 }} />
                {item}
              </li>
            ))}
          </ul>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            This strengthens internal oversight and supports wider governance, ESG, and RTMS-related requirements.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: "5rem 0",
          background: "linear-gradient(135deg, #0f1f3d 0%, #0a1628 100%)",
          textAlign: "center",
        }}
      >
        <div className="container-gfa">
          <h2 style={{ maxWidth: "560px", margin: "0 auto 1.25rem" }}>
            Work With GreenFreightAcademy
          </h2>
          <p style={{ maxWidth: "520px", margin: "0 auto 2.5rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            If you want a more structured way to deploy training, monitor progress, maintain driver records, and
            build capability over time, GreenFreightAcademy is designed to help.
          </p>
          <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/contact?type=fleet-company" className="btn-primary">
              Book a Consultation
              <ArrowRight size={16} />
            </Link>
            <Link href="/programmes" className="btn-secondary">
              Explore Programmes
            </Link>
            <Link href="/login" className="btn-ghost">
              Client Login
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
