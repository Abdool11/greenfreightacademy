"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "paid" | "failed">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!searchParams) return;
    const reference = searchParams.get("reference");
    const trxref = searchParams.get("trxref");

    // Paystack redirects back with reference (and sometimes trxref)
    const paystackRef = reference || trxref;
    if (!paystackRef) {
      setStatus("failed");
      setMessage("No payment reference found. Please return to your dashboard and try again.");
      return;
    }

    // Verify the payment via our server
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch("/api/company/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: paystackRef }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && (data.paid || data.alreadyPaid)) {
            setStatus("paid");
            setMessage("Payment successful! You can now deploy training to your drivers.");
            clearInterval(interval);
            return;
          }
        }
      } catch {
        // ignore
      }

      if (attempts >= maxAttempts) {
        setStatus("checking");
        setMessage("We're confirming your payment. This may take a moment. If you don't see your quote marked as paid shortly, please refresh your dashboard or contact us.");
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [searchParams]);

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      <div className="container-gfa" style={{ padding: "3rem 0", textAlign: "center" }}>
        {status === "checking" && (
          <>
            <Loader2 size={48} className="animate-spin" style={{ margin: "0 auto 1.5rem", display: "block", color: "#3b82f6" }} />
            <h1 style={{ fontSize: "1.5rem", color: "#f9fafb", marginBottom: "0.75rem" }}>Confirming Payment...</h1>
            <p style={{ color: "#6b7280", maxWidth: "480px", margin: "0 auto 2rem" }}>{message || "Please wait while we confirm your payment with Paystack."}</p>
          </>
        )}

        {status === "paid" && (
          <>
            <CheckCircle2 size={56} style={{ margin: "0 auto 1.5rem", display: "block", color: "#22c55e" }} />
            <h1 style={{ fontSize: "1.5rem", color: "#f9fafb", marginBottom: "0.75rem" }}>Payment Successful!</h1>
            <p style={{ color: "#6b7280", maxWidth: "480px", margin: "0 auto 2rem" }}>{message}</p>
            <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#22c55e", color: "#000", border: "none", borderRadius: "0.625rem", padding: "0.75rem 1.5rem", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none", cursor: "pointer" }}>
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle size={56} style={{ margin: "0 auto 1.5rem", display: "block", color: "#ef4444" }} />
            <h1 style={{ fontSize: "1.5rem", color: "#f9fafb", marginBottom: "0.75rem" }}>Payment Not Completed</h1>
            <p style={{ color: "#6b7280", maxWidth: "480px", margin: "0 auto 2rem" }}>{message}</p>
            <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa", borderRadius: "0.625rem", padding: "0.75rem 1.5rem", fontWeight: 600, fontSize: "0.875rem", textDecoration: "none", cursor: "pointer" }}>
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={
      <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh", textAlign: "center" }}>
        <Loader2 size={48} className="animate-spin" style={{ margin: "3rem auto", display: "block", color: "#3b82f6" }} />
      </div>
    }>
      <PaymentReturnContent />
    </Suspense>
  );
}
