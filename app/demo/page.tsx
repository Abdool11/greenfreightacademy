"use client";

import { DemoProvider, useDemo, TOUR_STEPS } from "@/lib/demo-context";
import DemoTourOverlay from "@/components/DemoTourOverlay";
import DemoDashboardPage from "@/components/demo/DemoDashboardPage";
import DemoImportPage from "@/components/demo/DemoImportPage";
import DemoCampaignsPage from "@/components/demo/DemoCampaignsPage";
import DemoBulletinsPage from "@/components/demo/DemoBulletinsPage";
import DemoReportsPage from "@/components/demo/DemoReportsPage";

// ─── Page router ──────────────────────────────────────────────────────────────
// Renders the correct demo page component based on the current tour step's page.
// This keeps everything in a single Next.js route (/demo) so no auth redirects
// can interrupt the tour, and no real API calls are ever made.

function DemoPageRouter() {
  const { currentStep } = useDemo();

  const page = currentStep.page;

  if (page === "/dashboard/import")             return <DemoImportPage />;
  if (page === "/dashboard/training-campaigns") return <DemoCampaignsPage />;
  if (page === "/dashboard/bulletins")          return <DemoBulletinsPage />;
  if (page === "/dashboard/reports")            return <DemoReportsPage />;
  // Default: main dashboard (welcome step, dashboard steps, finish step)
  return <DemoDashboardPage />;
}

export default function DemoEntryPage() {
  return (
    <DemoProvider>
      <div style={{ minHeight: "100vh", background: "#060e1c", paddingBottom: "60px" }}>
        <DemoPageRouter />
        <DemoTourOverlay />
      </div>
    </DemoProvider>
  );
}
