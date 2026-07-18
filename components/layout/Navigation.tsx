"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, ChevronRight, LogOut, User } from "lucide-react";
import { NAV_LINKS, NAV_CTA_PRIMARY, NAV_CTA_SECONDARY, SITE_NAME, LOGO_URL } from "@/lib/constants";

interface SessionInfo {
  authenticated: boolean;
  companyName?: string;
  email?: string;
}

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: SessionInfo) => setSession(d))
      .catch(() => setSession({ authenticated: false }));
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setSession({ authenticated: false });
      setIsOpen(false);
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease",
        background: scrolled
          ? "rgba(10, 22, 40, 0.92)"
          : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid transparent",
      }}
    >
      <div className="container-gfa">
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "5rem",
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
            {/* TODO: Asif — replace src with CDN URL once GFA logo is uploaded */}
            <div
              style={{
                width: "2.75rem",
                height: "2.75rem",
                background: "linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)",
                borderRadius: "0.625rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.1rem",
                color: "#0a1628",
                flexShrink: 0,
              }}
            >
              GFA
            </div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "1rem",
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
                  fontSize: "0.75rem",
                  color: "var(--color-green-400)",
                  letterSpacing: "0.02em",
                }}
              >
                Academy
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div
            style={{
              alignItems: "center",
              gap: "2rem",
            }}
            className="hidden md:flex"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "0.9rem",
                  color: "rgba(255,255,255,0.75)",
                  textDecoration: "none",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div style={{ alignItems: "center", gap: "0.75rem" }} className="hidden md:flex">
            {session?.authenticated ? (
              <>
                <Link
                  href="/dashboard"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.875rem",
                    borderRadius: "0.625rem",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    textDecoration: "none",
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={session.companyName || session.email || "My account"}
                >
                  <User size={15} style={{ color: "var(--color-green-400)", flexShrink: 0 }} />
                  {session.companyName || session.email || "My account"}
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.625rem",
                    background: "transparent",
                    border: "1px solid rgba(239,68,68,0.4)",
                    color: "#f87171",
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    cursor: loggingOut ? "not-allowed" : "pointer",
                    opacity: loggingOut ? 0.6 : 1,
                  }}
                >
                  <LogOut size={15} />
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>
              </>
            ) : (
              <>
                <Link href={NAV_CTA_SECONDARY.href} className="btn-secondary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}>
                  {NAV_CTA_SECONDARY.label}
                </Link>
                <Link href={NAV_CTA_PRIMARY.href} className="btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}>
                  {NAV_CTA_PRIMARY.label}
                  <ChevronRight size={15} />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: "0.5rem",
            }}
            className="md:hidden"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div
          style={{
            background: "rgba(10, 22, 40, 0.98)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "1.5rem",
          }}
          className="md:hidden"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                style={{
                  padding: "0.875rem 0",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "1rem",
                  color: "rgba(255,255,255,0.8)",
                  textDecoration: "none",
                }}
              >
                {link.label}
              </Link>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.25rem" }}>
              {session?.authenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.625rem",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "white",
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      textDecoration: "none",
                    }}
                  >
                    <User size={16} style={{ color: "var(--color-green-400)" }} />
                    {session.companyName || session.email || "My account"}
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.625rem",
                      background: "transparent",
                      border: "1px solid rgba(239,68,68,0.4)",
                      color: "#f87171",
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      cursor: loggingOut ? "not-allowed" : "pointer",
                      opacity: loggingOut ? 0.6 : 1,
                    }}
                  >
                    <LogOut size={16} />
                    {loggingOut ? "Logging out..." : "Log out"}
                  </button>
                </>
              ) : (
                <>
                  <Link href={NAV_CTA_SECONDARY.href} className="btn-secondary" onClick={() => setIsOpen(false)}>
                    {NAV_CTA_SECONDARY.label}
                  </Link>
                  <Link href={NAV_CTA_PRIMARY.href} className="btn-primary" onClick={() => setIsOpen(false)}>
                    {NAV_CTA_PRIMARY.label}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
