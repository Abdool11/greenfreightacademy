"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  quoteId: string;
  quoteReference: string;
  companyName: string;
  paymentMethod?: string;
  quoteStatus?: string;
}

export default function PendingPaymentsWidget({ quoteId, quoteReference, companyName, paymentMethod, quoteStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function markAsPaid() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/quotes/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to mark as paid");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[120px]">
      {paymentMethod && (
        <span className={`text-xs px-2 py-0.5 rounded-full text-center ${
          paymentMethod === "eft" || quoteStatus === "eft_submitted"
            ? "bg-amber-500/20 text-amber-400"
            : "bg-blue-500/20 text-blue-400"
        }`}>
          {quoteStatus === "eft_submitted" ? "EFT Submitted" : (paymentMethod === "eft" ? "EFT" : "Card")}
        </span>
      )}
      <button
        onClick={markAsPaid}
        disabled={loading}
        className="bg-[#2ecc71] hover:bg-[#27ae60] disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
      >
        {loading ? "Processing…" : "Approve Payment"}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
