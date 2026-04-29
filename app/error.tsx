"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GFA Error]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-slate-900)",
        padding: "2rem",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        <div
          style={{
            width: "3rem",
            height: "3rem",
            borderRadius: "50%",
            background: "rgba(248, 113, 113, 0.12)",
            border: "1px solid rgba(248, 113, 113, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            fontSize: "1.25rem",
          }}
        >
          ⚠
        </div>
        <h2 style={{ marginBottom: "0.75rem" }}>Something went wrong</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem", fontSize: "0.9375rem" }}>
          An unexpected error occurred. Please try again, or contact support if the problem persists.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={reset} className="btn-primary" style={{ fontSize: "0.875rem" }}>
            Try again
          </button>
          <Link href="/" className="btn-secondary" style={{ fontSize: "0.875rem" }}>
            Return home
          </Link>
        </div>
        {error.digest && (
          <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--text-muted)", opacity: 0.5 }}>
            Error reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
