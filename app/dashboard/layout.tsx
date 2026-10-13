import type { ReactNode } from "react";

/**
 * Dashboard shell.
 *
 * The site header is `position: fixed`, so it does not occupy layout space and
 * each page has to reserve the header height itself. Only some dashboard pages
 * did, which is why pages such as /dashboard/campaigns and
 * /dashboard/cpd-library rendered their heading underneath the header.
 *
 * Applying the offset once here makes every dashboard route correct by default
 * instead of depending on each page remembering to add it.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        paddingTop: "5rem",
        background: "var(--color-slate-900)",
        minHeight: "100vh",
      }}
    >
      {children}
    </div>
  );
}
