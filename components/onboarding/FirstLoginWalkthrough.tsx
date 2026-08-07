"use client";

/**
 * FirstLoginWalkthrough
 * ─────────────────────────────────────────────────────────────────────────────
 * A lightweight 5-step tooltip-style walkthrough that fires automatically
 * the first time a user lands on the dashboard after registering.
 *
 * Implementation notes:
 *  - Triggered by localStorage key "gfa_walkthrough_done" being absent
 *  - Also triggered if URL contains ?welcome=1 (set by register page on redirect)
 *  - Purely presentational — no DB, no API, no changes to existing logic
 *  - Each step is a centred modal card (not anchor-targeted) to avoid layout
 *    dependency on element IDs that Asif may change
 *  - Skippable at any point; completion sets the localStorage key
 */

import { useEffect, useState } from "react";
import {
  Users, FileText, CreditCard, Send, BarChart3,
  ChevronRight, ChevronLeft, X, CheckCircle2,
} from "lucide-react";

const STORAGE_KEY = "gfa_walkthrough_done";

interface Step {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  body: string;
  tip?: string;
}

const STEPS: Step[] = [
  {
    icon: Users,
    iconColor: "#3b82f6",
    title: "Step 1 — Add your drivers",
    body: "Start by adding the drivers you want to train. Use the green \"Add Drivers\" button for small groups, or \"Import from Excel\" to upload your full fleet at once.",
    tip: "You'll need each driver's first name, last name, and mobile number. Mobile is mandatory — it's how drivers access their training.",
  },
  {
    icon: FileText,
    iconColor: "#22c55e",
    title: "Step 2 — Select drivers to enrol",
    body: "In the Training Matrix, tick the \"Enrol\" checkbox next to each driver and programme you want to activate. You can select all drivers at once using the column header.",
    tip: "Only the Professional Truck Driver Programme (PTDP) is active right now. More programmes are coming soon.",
  },
  {
    icon: CreditCard,
    iconColor: "#f59e0b",
    title: "Step 3 — Get a quote and pay",
    body: "Click \"Get Quote\" to generate your training invoice. You'll receive it by email. Pay securely via card (Paystack) or EFT to our Nedbank account.",
    tip: "The R75 signup fee per driver is once-off. The R75/driver/month subscription covers coursework and quarterly CPD.",
  },
  {
    icon: Send,
    iconColor: "#a78bfa",
    title: "Step 4 — Deploy training",
    body: "Once payment is confirmed, the \"Deploy Training\" button appears. Click it and training is sent directly to your drivers via WhatsApp or SMS — no app download needed.",
    tip: "Drivers receive a personalised link on their phone. They can complete modules in their own time, even offline.",
  },
  {
    icon: BarChart3,
    iconColor: "#22c55e",
    title: "Step 5 — Track progress",
    body: "Your Training Matrix updates in real time. See who is Enrolled, In Progress, or Certified. Use the Nudge button to send a reminder to drivers who haven't started yet.",
    tip: "Use the Reports page for a full audit trail — useful for RTMS compliance and insurance documentation.",
  },
];

export default function FirstLoginWalkthrough() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (done) return;

    // Show if ?welcome=1 in URL OR if this is a fresh session
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1" || !done) {
      // Small delay so the dashboard has time to render
      const t = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setActive(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  };

  const prev = () => setStep(s => Math.max(0, s - 1));

  if (!active) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={finish}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.65)",
          zIndex: 9998,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Card */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: "min(480px, 92vw)",
          background: "linear-gradient(160deg, #0d1526 0%, #0f1f3d 100%)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: "1rem",
          padding: "1.75rem",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <span
            style={{
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: "9999px",
              padding: "0.125rem 0.625rem",
              color: "#22c55e",
              fontSize: "0.6875rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            GETTING STARTED
          </span>
          <button
            onClick={finish}
            aria-label="Close walkthrough"
            style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", padding: "0.25rem" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: "3px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "9999px",
            marginBottom: "1.5rem",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "#22c55e",
              borderRadius: "9999px",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Icon */}
        <div
          style={{
            background: current.iconColor + "15",
            border: `1px solid ${current.iconColor}30`,
            borderRadius: "0.75rem",
            padding: "0.875rem",
            display: "inline-flex",
            marginBottom: "1rem",
            color: current.iconColor,
          }}
        >
          <Icon size={24} />
        </div>

        {/* Content */}
        <h3 style={{ margin: "0 0 0.625rem", fontSize: "1.0625rem", color: "#f9fafb", fontWeight: 700 }}>
          {current.title}
        </h3>
        <p style={{ margin: "0 0 0.875rem", color: "#d1d5db", fontSize: "0.9375rem", lineHeight: 1.6 }}>
          {current.body}
        </p>

        {current.tip && (
          <div
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: "0.5rem",
              padding: "0.625rem 0.875rem",
              marginBottom: "1.25rem",
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-start",
            }}
          >
            <span style={{ color: "#f59e0b", flexShrink: 0, marginTop: "1px" }}>💡</span>
            <span style={{ color: "#d1d5db", fontSize: "0.8125rem", lineHeight: 1.5 }}>{current.tip}</span>
          </div>
        )}

        {/* Step counter + nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.25rem" }}>
          <span style={{ color: "#4b5563", fontSize: "0.8125rem" }}>
            {step + 1} of {STEPS.length}
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {step > 0 && (
              <button
                onClick={prev}
                style={{
                  display: "flex", alignItems: "center", gap: "0.25rem",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 0.875rem",
                  color: "#9ca3af",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <ChevronLeft size={15} /> Back
              </button>
            )}
            <button
              onClick={next}
              style={{
                display: "flex", alignItems: "center", gap: "0.25rem",
                background: "#22c55e",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.5rem 1.125rem",
                color: "#000",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {step < STEPS.length - 1 ? (
                <><ChevronRight size={15} /> Next</>
              ) : (
                <><CheckCircle2 size={15} /> Got it — let&apos;s go!</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
