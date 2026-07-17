"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  quoteId: string;
  quoteReference: string;
  companyName: string;
}

export default function PendingPaymentsWidget({ quoteId, quoteReference, companyName }: Props) {
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
      <button
        onClick={markAsPaid}
        disabled={loading}
        className="bg-[#2ecc71] hover:bg-[#27ae60] disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
      >
        {loading ? "Processing…" : "Mark as Paid"}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
