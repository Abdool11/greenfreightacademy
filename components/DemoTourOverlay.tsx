"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDemo, TOUR_STEPS } from "@/lib/demo-context";
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

// ─── Tooltip position calculator ─────────────────────────────────────────────
function getTooltipStyle(
  targetRect: DOMRect | null,
  position: string,
  tooltipW = 380,
  tooltipH = 220,
  bottomInset = 0
): React.CSSProperties {
  if (!targetRect || position === "center") {
    return {
      position: "fixed",
      top: `calc(50% - ${bottomInset / 2}px)`,
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 10001,
      width: tooltipW,
    };
  }

  const margin = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;

  switch (position) {
    case "bottom":
      top  = targetRect.bottom + margin;
      left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
      break;
    case "top":
      top  = targetRect.top - tooltipH - margin;
      left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
      break;
    case "right":
      top  = targetRect.top + targetRect.height / 2 - tooltipH / 2;
      left = targetRect.right + margin;
      break;
    case "left":
      top  = targetRect.top + targetRect.height / 2 - tooltipH / 2;
      left = targetRect.left - tooltipW - margin;
      break;
    default:
      top  = targetRect.bottom + margin;
      left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
  }

  // Clamp to viewport
  // bottomInset reserves the fixed demo progress bar, which is painted above the
  // card (zIndex 10002 vs 10001). Without it the card is clamped to the very
  // bottom of the viewport and the bar covers the Back/Next buttons.
  left = Math.max(margin, Math.min(left, vw - tooltipW - margin));
  top  = Math.max(margin, Math.min(top,  vh - tooltipH - margin - bottomInset));

  return { position: "fixed", top, left, zIndex: 10001, width: tooltipW };
}

// ─── Spotlight overlay ────────────────────────────────────────────────────────
function SpotlightOverlay({ targetRect }: { targetRect: DOMRect | null }) {
  if (!targetRect) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)",
          zIndex: 10000, pointerEvents: "none",
        }}
      />
    );
  }

  const pad = 8;
  const { top, left, width, height } = targetRect;

  return (
    <svg
      style={{ position: "fixed", inset: 0, zIndex: 10000, pointerEvents: "none" }}
      width="100%" height="100%"
    >
      <defs>
        <mask id="spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={left - pad} y={top - pad}
            width={width + pad * 2} height={height + pad * 2}
            rx="8" fill="black"
          />
        </mask>
      </defs>
      <rect
        width="100%" height="100%"
        fill="rgba(0,0,0,0.72)"
        mask="url(#spotlight-mask)"
      />
      <rect
        x={left - pad} y={top - pad}
        width={width + pad * 2} height={height + pad * 2}
        rx="8" fill="none"
        stroke="rgba(34,197,94,0.7)" strokeWidth="2"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DemoTourOverlay() {
  const {
    currentStep, currentStepIndex, totalSteps,
    next, prev, exitDemo,
  } = useDemo();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  // All simulated dashboard states render inside /demo. Moving to real dashboard
  // routes here would trigger authentication and interrupt the first Forward click.

  // Track the target element's bounding rect (re-measured on each animation frame)
  useEffect(() => {
    const measure = () => {
      if (currentStep.targetId) {
        const el = document.getElementById(currentStep.targetId);
        if (el) {
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          setTargetRect(null);
        }
      } else {
        setTargetRect(null);
      }
      rafRef.current = requestAnimationFrame(measure);
    };

    rafRef.current = requestAnimationFrame(measure);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentStep.targetId]);

  const cardRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(220);
  const [barHeight, setBarHeight] = useState(0);

  // The card height varies per step. Clamping against a fixed 220px estimate
  // positioned taller cards too low and pushed the Next button off-screen, so
  // measure the rendered card and clamp against the real height. The progress
  // bar is measured too so the clamp can keep the card clear of it.
  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
    if (barRef.current) setBarHeight(barRef.current.offsetHeight);
    // Keyed on the step only: the spotlight re-measures targetRect every frame,
    // so depending on it would read layout on every frame for no benefit.
  }, [currentStepIndex]);

  const tooltipStyle = getTooltipStyle(targetRect, currentStep.position ?? "center", 380, cardHeight, barHeight);
  const isFirst = currentStepIndex === 0;
  const isLast  = currentStepIndex === totalSteps - 1;
  const pct     = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  const handleNext = () => {
    if (isLast) {
      exitDemo();
    } else {
      next();
    }
  };

  return (
    <>
      <SpotlightOverlay targetRect={targetRect} />

      {/* Tooltip card */}
      <div ref={cardRef} style={{
        ...tooltipStyle,
        background: "#0f1f3d",
        border: "1px solid rgba(34,197,94,0.35)",
        borderRadius: "0.875rem",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        padding: "1.5rem",
        fontFamily: "inherit",
        maxHeight: `calc(100vh - ${barHeight + 32}px)`,
        overflowY: "auto",
      }}>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{
              background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "9999px", padding: "0.125rem 0.625rem",
              color: "#22c55e", fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.05em",
            }}>
              DEMO TOUR
            </span>
            <span style={{ color: "#4b5563", fontSize: "0.75rem" }}>
              {currentStepIndex + 1} / {totalSteps}
            </span>
          </div>
          <button
            onClick={exitDemo}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#4b5563", padding: "0.25rem", borderRadius: "0.375rem",
              display: "flex", alignItems: "center",
            }}
            title="Exit demo"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{
          height: "3px", background: "rgba(255,255,255,0.06)",
          borderRadius: "9999px", marginBottom: "1rem", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: "linear-gradient(90deg, #22c55e, #16a34a)",
            borderRadius: "9999px", transition: "width 0.3s ease",
          }} />
        </div>

        {/* Title */}
        <h3 style={{
          margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 700,
          color: "#f9fafb", lineHeight: 1.3,
        }}>
          {currentStep.title}
        </h3>

        {/* Body */}
        <p style={{
          margin: "0 0 1.25rem", fontSize: "0.875rem",
          color: "#9ca3af", lineHeight: 1.6,
        }}>
          {currentStep.body}
        </p>

        {/* Navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={prev}
            disabled={isFirst}
            style={{
              display: "flex", alignItems: "center", gap: "0.375rem",
              background: "none", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.5rem", padding: "0.5rem 0.875rem",
              color: isFirst ? "#374151" : "#9ca3af",
              fontSize: "0.8125rem", cursor: isFirst ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            <ChevronLeft size={14} />
            {currentStep.prevLabel ?? "Back"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <button type="button" onClick={exitDemo} style={{ background: "transparent", border: "none", color: "#9ca3af", fontSize: "0.78rem", cursor: "pointer", padding: "0.45rem" }}>Exit</button>
          <button
            type="button"
            onClick={handleNext}
            style={{
              display: "flex", alignItems: "center", gap: "0.375rem",
              background: isLast ? "#22c55e" : "rgba(34,197,94,0.12)",
              border: `1px solid ${isLast ? "#22c55e" : "rgba(34,197,94,0.3)"}`,
              borderRadius: "0.5rem", padding: "0.5rem 1rem",
              color: isLast ? "#000" : "#22c55e",
              fontSize: "0.8125rem", cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {isLast ? (
              <>
                <ExternalLink size={13} />
                {currentStep.nextLabel ?? "Book a company engagement"}
              </>
            ) : (
              <>
                {currentStep.nextLabel ?? "Next"}
                <ChevronRight size={14} />
              </>
            )}
          </button>
          </div>
        </div>
      </div>

      {/* Fixed bottom progress bar */}
      <div ref={barRef} style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#0a1628", borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "0.625rem 1.5rem",
        display: "flex", alignItems: "center", gap: "1rem",
        zIndex: 10002,
      }}>
        <span style={{ color: "#4b5563", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
          Demo walkthrough
        </span>
        <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "9999px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: "linear-gradient(90deg, #22c55e, #16a34a)",
            borderRadius: "9999px", transition: "width 0.4s ease",
          }} />
        </div>
        <span style={{ color: "#22c55e", fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" }}>
          {pct}%
        </span>
        <button
          onClick={exitDemo}
          style={{
            background: "none", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0.375rem", padding: "0.25rem 0.625rem",
            color: "#6b7280", fontSize: "0.75rem", cursor: "pointer",
          }}
        >
          Exit demo
        </button>
      </div>
    </>
  );
}
