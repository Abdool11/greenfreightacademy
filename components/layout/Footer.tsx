"use client";

import Link from "next/link";
import { FOOTER_LINKS, SITE_NAME, ECOSYSTEM_URLS } from "@/lib/constants";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "var(--color-slate-900)",
        borderTop: "1px solid var(--border-subtle)",
        paddingTop: "4rem",
        paddingBottom: "2rem",
      }}
    >
      <div className="container-gfa">
        {/* Top row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "2.5rem",
            marginBottom: "3rem",
          }}
        >
          {/* Brand column */}
          <div style={{ gridColumn: "span 1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "2.25rem",
                  height: "2.25rem",
                  background: "linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)",
                  borderRadius: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "0.875rem",
                  color: "#0a1628",
                }}
              >
                GFA
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", color: "white" }}>
                  GreenFreightAcademy
                </div>
              </div>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.6, maxWidth: "220px" }}>
              The enterprise capability and performance engine for road freight transformation.
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.5rem", opacity: 0.55, lineHeight: 1.5, maxWidth: "220px" }}>
              Transport Action Group (Pty) Ltd<br />
              Reg. No. K2021/8073/07<br />
              Incorporated RSA 2021
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem", opacity: 0.6 }}>
              Part of the{" "}
              <Link href={ECOSYSTEM_URLS.zeroAfrica} style={{ color: "var(--color-green-400)", textDecoration: "none" }}>
                ZeroAfrica
              </Link>{" "}
              ecosystem
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((group) => (
            <div key={group.heading}>
              <h4
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: "1rem",
                }}
              >
                {group.heading}
              </h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--text-muted)",
                        textDecoration: "none",
                        transition: "color 0.2s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            © {currentYear} {SITE_NAME}. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <Link href="/privacy" style={{ fontSize: "0.8rem", color: "var(--text-muted)", textDecoration: "none" }}>
              Privacy Policy
            </Link>
            <Link href="/terms" style={{ fontSize: "0.8rem", color: "var(--text-muted)", textDecoration: "none" }}>
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
