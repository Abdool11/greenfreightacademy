"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

// ─── Tour Step Definition ─────────────────────────────────────────────────────

export interface TourStep {
  id: string;
  title: string;
  body: string;
  targetId?: string;          // DOM element id to spotlight
  page: string;               // pathname this step belongs to
  position?: "top" | "bottom" | "left" | "right" | "center";
  nextLabel?: string;
  prevLabel?: string;
  action?: "navigate";
  actionTarget?: string;
}

export const TOUR_STEPS: TourStep[] = [
  // ── Welcome ──────────────────────────────────────────────────────────────
  {
    id: "welcome",
    page: "/demo",
    title: "Welcome to the GFA Client Dashboard",
    body: "This guided walkthrough shows you exactly how Horizon Freight manages their driver training programme — from importing a cohort through to certification and reporting. Use the arrows to move through each step at your own pace.",
    position: "center",
    nextLabel: "Start the tour →",
  },

  // ── Step 1: Import ────────────────────────────────────────────────────────
  {
    id: "import-intro",
    page: "/dashboard/import",
    title: "Step 1 — Import your driver cohort",
    body: "The first step is to import your drivers using a standard Excel file. You simply download the template, fill in your driver details (name, mobile, email, branch), and upload it here. The system validates each row and shows you a preview before saving.",
    targetId: "demo-import-dropzone",
    position: "bottom",
    nextLabel: "See the driver list →",
  },
  {
    id: "import-result",
    page: "/dashboard/import",
    title: "Import complete",
    body: "Horizon Freight imported 10 drivers across four branches in under 2 minutes. Duplicate mobile numbers are automatically skipped. The drivers are now ready to be allocated to a training programme.",
    targetId: "demo-import-result",
    position: "bottom",
    nextLabel: "Allocate to a programme →",
  },

  // ── Step 2: Dashboard — Allocate & Quote ─────────────────────────────────
  {
    id: "dashboard-drivers",
    page: "/dashboard",
    title: "Step 2 — Allocate drivers to a programme",
    body: "Your imported drivers appear in the driver table. For each driver, you select which programme to enrol them in — the Professional Truck Driver Programme, Eco-Driver Training, or both. The system calculates a quote automatically.",
    targetId: "demo-driver-table",
    position: "top",
    nextLabel: "View the quote →",
  },
  {
    id: "dashboard-quote",
    page: "/dashboard",
    title: "Confirm payment and deploy",
    body: "Once you are happy with the quote, you confirm payment (card or invoice) and click Deploy Training. The platform instantly sends each driver a personalised WhatsApp welcome message with their magic login link — no passwords, no app downloads required.",
    targetId: "demo-quote-panel",
    position: "top",
    nextLabel: "Monitor progress →",
  },

  // ── Step 3: Training Campaigns ────────────────────────────────────────────
  {
    id: "campaigns-overview",
    page: "/dashboard/training-campaigns",
    title: "Step 3 — Monitor cohort progress",
    body: "The Training Campaigns view gives you a live picture of each cohort. You can see how many drivers have started, how many are in progress, and how many have completed the programme — all in real time.",
    targetId: "demo-campaigns-list",
    position: "top",
    nextLabel: "See outstanding drivers →",
  },
  {
    id: "campaigns-nudge",
    page: "/dashboard/training-campaigns",
    title: "Send a WhatsApp nudge",
    body: "For drivers who have not yet started or are falling behind, you can send a personalised WhatsApp reminder with a single click. The system logs the nudge date so you can track follow-up activity.",
    targetId: "demo-nudge-button",
    position: "right",
    nextLabel: "View driver feedback →",
  },
  {
    id: "campaigns-feedback",
    page: "/dashboard/training-campaigns",
    title: "Driver feedback scores",
    body: "After completing each module, drivers rate their experience. You can see average scores for understanding, enjoyment, and desire to learn more. Horizon Freight's cohort is averaging 4.4 out of 5 for understanding — a strong indicator of content quality and driver engagement.",
    targetId: "demo-feedback-panel",
    position: "bottom",
    nextLabel: "Issue a safety bulletin →",
  },

  // ── Step 4: Bulletins ─────────────────────────────────────────────────────
  {
    id: "bulletins-intro",
    page: "/dashboard/bulletins",
    title: "Step 4 — Issue a driver bulletin",
    body: "The bulletin tool lets you push a structured safety, operational, or CPD message directly to your drivers on the BetterDriver portal. Each bulletin includes the issue description, why it matters, the mitigation message, and a specific driver action.",
    targetId: "demo-bulletin-form",
    position: "right",
    nextLabel: "See urgency options →",
  },
  {
    id: "bulletins-urgency",
    page: "/dashboard/bulletins",
    title: "Urgency and audience settings",
    body: "Standard bulletins are shared with the GFA community CPD library at no cost. Urgent bulletins are kept confidential to your company and carry a once-off fee. You can choose to pay immediately by card or include it on your monthly invoice.",
    targetId: "demo-bulletin-urgency",
    position: "bottom",
    nextLabel: "View existing bulletins →",
  },
  {
    id: "bulletins-history",
    page: "/dashboard/bulletins",
    title: "Your bulletin history",
    body: "Horizon Freight has issued two bulletins this month — one urgent safety bulletin about a tyre blowout incident, and one standard operational bulletin about fuel efficiency. Both have been delivered to all enrolled drivers via the BetterDriver portal.",
    targetId: "demo-bulletin-history",
    position: "top",
    nextLabel: "View reports →",
  },

  // ── Step 5: Reports ───────────────────────────────────────────────────────
  {
    id: "reports-summary",
    page: "/dashboard/reports",
    title: "Step 5 — Programme reports",
    body: "The Reports section gives you a full picture of your training investment. You can see overall completion rates, certification counts, progress by branch, and driver feedback scores — all exportable as a PDF or Excel file.",
    targetId: "demo-reports-summary",
    position: "bottom",
    nextLabel: "See branch breakdown →",
  },
  {
    id: "reports-branch",
    page: "/dashboard/reports",
    title: "Performance by branch",
    body: "Breaking down performance by branch lets you identify where coaching support is most needed. Horizon Freight can see that the Cape Town branch has a 100% completion rate, while the Pretoria branch is lagging at 44% average progress — a clear signal for targeted follow-up.",
    targetId: "demo-reports-branch",
    position: "top",
    nextLabel: "Finish the tour →",
  },

  // ── Finish ────────────────────────────────────────────────────────────────
  {
    id: "finish",
    page: "/dashboard/reports",
    title: "That is the full GFA client journey",
    body: "From importing a cohort to monitoring progress, issuing bulletins, and downloading reports — everything your team needs is in one place. Ready to get started with your own fleet? Book a company engagement or enrol your first cohort today.",
    position: "center",
    nextLabel: "Book a company engagement",
    prevLabel: "← Back",
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

interface DemoContextValue {
  isDemo: boolean;
  currentStepIndex: number;
  currentStep: TourStep;
  totalSteps: number;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  exitDemo: () => void;
  stepsForPage: (page: string) => TourStep[];
  activeStepForPage: (page: string) => TourStep | null;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const next = useCallback(() => {
    setCurrentStepIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
  }, []);

  const prev = useCallback(() => {
    setCurrentStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrentStepIndex(Math.max(0, Math.min(index, TOUR_STEPS.length - 1)));
  }, []);

  const exitDemo = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/pricing";
    }
  }, []);

  const stepsForPage = useCallback(
    (page: string) => TOUR_STEPS.filter((s) => s.page === page),
    []
  );

  const activeStepForPage = useCallback(
    (page: string) => {
      const current = TOUR_STEPS[currentStepIndex];
      if (current.page === page) return current;
      return null;
    },
    [currentStepIndex]
  );

  return (
    <DemoContext.Provider
      value={{
        isDemo: true,
        currentStepIndex,
        currentStep: TOUR_STEPS[currentStepIndex],
        totalSteps: TOUR_STEPS.length,
        next,
        prev,
        goTo,
        exitDemo,
        stepsForPage,
        activeStepForPage,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}
