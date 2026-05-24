/**
 * GreenFreightAcademy — Reports
 *
 * DATA REQUIREMENTS:
 * - TODO: Asif to implement data fetching for this page
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reports",
  description: "Download progress reports, certification records, and cohort performance summaries for your company.",
};

export default function Page() {
  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      <section
        style={{
          padding: "5rem 0 4rem",
          background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container-gfa">
          <span className="pill-badge pill-green" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
            Reports
          </span>
          <h1 style={{ maxWidth: "600px", marginBottom: "1rem" }}>
            Progress and certification reports
          </h1>
          <p style={{ maxWidth: "520px", color: "var(--text-secondary)" }}>
            Download progress reports, certification records, and cohort performance summaries for your company.
          </p>
        </div>
      </section>
      <section style={{ padding: "4rem 0" }}>
        <div className="container-gfa">
          <div className="mock-banner">
            Content for this page is being developed — TODO: Asif to implement
          </div>
          <div style={{ marginTop: "2rem" }}>
            <Link href="/" className="btn-secondary">Return to homepage</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
