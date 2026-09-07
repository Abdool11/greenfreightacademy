"use client";

/**
 * DemoTourBanner
 * ─────────────────────────────────────────────────────────────────────────────
 * A dismissable banner shown on the client dashboard that surfaces the
 * existing /demo guided tour. Visibility is controlled entirely by
 * localStorage — no database, no API calls, no impact on existing logic.
 *
 * Rules:
 *  - Shown when localStorage key "gfa_demo_banner_dismissed" is NOT set
 *  - Dismissed permanently when the user clicks ✕ (sets the key)
 *  - Also hidden if the user has 3+ drivers (they're past onboarding)
 */

import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";

const STORAGE_KEY = "gfa_demo_banner_dismissed";

interface Props {
  driverCount: number;
}

export default function DemoTourBanner({ driverCount }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if not dismissed and user still has few drivers
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed && driverCount < 3) {
      setVisible(true);
    }
  }, [driverCount]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(13,21,38,0.95) 0%, rgba(15,31,61,0.95) 100%)",
        border: "1px solid rgba(34,197,94,0.3)",
        borderRadius: "0.875rem",
        padding: "1rem 1.25rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", flex: 1, minWidth: 0 }}>
        {/* Icon */}
        <div
          style={{
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: "0.625rem",
            padding: "0.625rem",
            color: "#22c55e",
            flexShrink: 0,
          }}
        >
          <Play size={18} />
        </div>

        {/* Copy */}
        <div>
          <p style={{ margin: 0, color: "#f9fafb", fontWeight: 700, fontSize: "0.9375rem" }}>
            New here? Take the 3-minute guided tour
          </p>
          <p style={{ margin: "0.2rem 0 0", color: "#9ca3af", fontSize: "0.8125rem" }}>
            See exactly how to add drivers, get a quote, and deploy training — step by step.
          </p>
        </div>
      </div>

      {/* CTA + dismiss */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexShrink: 0 }}>
        <a
          href="/demo?returnTo=/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            background: "#22c55e",
            color: "#000",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.5rem 1.125rem",
            fontWeight: 700,
            fontSize: "0.875rem",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          <Play size={14} /> Start tour
        </a>
        <button
          onClick={dismiss}
          aria-label="Dismiss tour banner"
          style={{
            background: "transparent",
            border: "none",
            color: "#6b7280",
            cursor: "pointer",
            padding: "0.25rem",
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
