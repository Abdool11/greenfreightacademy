"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const quoteId = searchParams?.get("quoteId");
  const ref = searchParams?.get("ref");
  const paystackRef = searchParams?.get("reference"); // Paystack appends this

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!quoteId) {
      setStatus("error");
      setMessage("Invalid payment reference.");
      return;
    }

    // Verify payment with Paystack
    fetch("/api/paystack/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId, paystackReference: paystackRef }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setStatus("success");
          setMessage("Your payment has been confirmed. Your training cohort is now being activated.");
        } else {
          setStatus("error");
          setMessage(d.error ?? "Payment verification failed. Please contact support.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Could not verify payment. Please contact support if you were charged.");
      });
  }, [quoteId, paystackRef]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060e1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "#0a1628",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "1rem",
          padding: "2.5rem",
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {status === "loading" && (
          <>
            <Loader2 size={40} style={{ color: "#22c55e", margin: "0 auto 1rem", display: "block", animation: "spin 1s linear infinite" }} />
            <h2 style={{ color: "#f9fafb", marginBottom: "0.5rem" }}>Verifying payment…</h2>
            <p style={{ color: "#6b7280", fontSize: "0.9375rem" }}>Please wait while we confirm your payment with Paystack.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 size={48} style={{ color: "#22c55e", margin: "0 auto 1rem", display: "block" }} />
            <h2 style={{ color: "#f9fafb", marginBottom: "0.5rem" }}>Payment confirmed!</h2>
            <p style={{ color: "#9ca3af", fontSize: "0.9375rem", marginBottom: "0.5rem" }}>{message}</p>
            {ref && (
              <p style={{ color: "#6b7280", fontSize: "0.8125rem", marginBottom: "1.5rem" }}>
                Quote reference: <strong style={{ color: "#f9fafb" }}>{ref}</strong>
              </p>
            )}
            <Link
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.625rem 1.25rem",
                background: "#22c55e",
                borderRadius: "0.5rem",
                color: "#000",
                fontWeight: 700,
                textDecoration: "none",
                fontSize: "0.9375rem",
              }}
            >
              Go to dashboard
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <AlertTriangle size={48} style={{ color: "#f87171", margin: "0 auto 1rem", display: "block" }} />
            <h2 style={{ color: "#f9fafb", marginBottom: "0.5rem" }}>Payment issue</h2>
            <p style={{ color: "#9ca3af", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>{message}</p>
            <Link
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.625rem 1.25rem",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.5rem",
                color: "#f9fafb",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "0.9375rem",
              }}
            >
              <ArrowLeft size={15} /> Back to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#060e1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} style={{ color: "#22c55e", animation: "spin 1s linear infinite" }} />
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}
