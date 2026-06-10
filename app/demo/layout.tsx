import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GFA Client Dashboard — Guided Demo | Green Freight Academy",
  description:
    "Take a guided tour of the GFA client dashboard. See how to import a driver cohort, allocate programmes, monitor progress, issue bulletins, and download reports.",
  robots: "noindex, nofollow",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
