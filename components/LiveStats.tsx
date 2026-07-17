/**
 * LiveStats — Server Component
 *
 * Queries Supabase directly (server-side, no API hop) and renders the
 * three bragging-strip numbers. Falls back to DEMO_METRICS if the DB
 * is unreachable so the homepage never shows zeros.
 *
 * Revalidation: Next.js ISR at 15-minute intervals via `revalidate`.
 */

import { supabaseAdmin, getConfigs } from "@/lib/supabase";
import { DEMO_METRICS } from "@/lib/constants";

export const revalidate = 900; // 15 minutes

async function fetchStats() {
  try {
    const [
      config,
      { count: companies, error: e1 },
      { count: drivers, error: e2 },
      { count: certificates, error: e3 },
    ] = await Promise.all([
      getConfigs([
        "stats_companies_mode",
        "stats_companies_static",
        "stats_drivers_mode",
        "stats_drivers_static",
        "stats_certificates_mode",
        "stats_certificates_static",
      ]),
      supabaseAdmin
        .from("companies")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabaseAdmin
        .from("drivers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabaseAdmin
        .from("certifications")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
    ]);

    if (e1 || e2 || e3) {
      console.error("[LiveStats] Supabase errors:", e1, e2, e3);
    }

    const resolve = (
      modeKey: string,
      staticKey: string,
      fallback: number,
      liveValue: number | null
    ): number => {
      const mode = config[modeKey] || "static";
      if (mode === "live") {
        return liveValue ?? fallback;
      }
      const staticVal = parseInt(config[staticKey] ?? "", 10);
      return isNaN(staticVal) ? fallback : staticVal;
    };

    return {
      companies: resolve(
        "stats_companies_mode",
        "stats_companies_static",
        DEMO_METRICS.companiesEnrolled,
        companies
      ),
      drivers: resolve(
        "stats_drivers_mode",
        "stats_drivers_static",
        DEMO_METRICS.seatsBooked,
        drivers
      ),
      certificates: resolve(
        "stats_certificates_mode",
        "stats_certificates_static",
        DEMO_METRICS.certificationsCompleted,
        certificates
      ),
    };
  } catch (err) {
    console.error("[LiveStats] Unexpected error:", err);
    return null;
  }
}

export async function LiveStats() {
  const stats = await fetchStats();

  const display = {
    seatsBooked: stats?.drivers ?? DEMO_METRICS.seatsBooked,
    certificationsCompleted: stats?.certificates ?? DEMO_METRICS.certificationsCompleted,
    companiesEnrolled: stats?.companies ?? DEMO_METRICS.companiesEnrolled,
  };

  const items = [
    { value: display.seatsBooked.toLocaleString(), label: "Seats booked" },
    { value: display.certificationsCompleted.toLocaleString(), label: "Certifications completed" },
    { value: `${display.companiesEnrolled}+`, label: "Companies enrolled" },
  ];

  return (
    <div
      style={{
        marginTop: "4rem",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "1.5rem",
        maxWidth: "600px",
      }}
    >
      {items.map((stat) => (
        <div
          key={stat.label}
          style={{
            padding: "1.25rem 1.5rem",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.75rem",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "2rem",
              color: "white",
              lineHeight: 1,
              marginBottom: "0.375rem",
            }}
          >
            {stat.value}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
