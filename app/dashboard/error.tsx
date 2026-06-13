"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
      <p style={{ color: "var(--text-muted)" }}>Something went wrong.</p>
      <button onClick={reset} className="btn-secondary" style={{ fontSize: "0.875rem" }}>Try again</button>
    </div>
  );
}
