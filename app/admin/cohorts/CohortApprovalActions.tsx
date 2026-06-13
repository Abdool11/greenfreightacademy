"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  deploymentId: string;
  currentStatus: string;
}

export default function CohortApprovalActions({ deploymentId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showEFTForm, setShowEFTForm] = useState(false);
  const [eftRef, setEftRef] = useState("");
  const [eftAmount, setEftAmount] = useState("");
  const [error, setError] = useState("");

  async function updateStatus(action: string, extra?: Record<string, string>) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/cohorts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentId, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Action failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (currentStatus === "pending_payment") {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        {!showEFTForm ? (
          <button
            onClick={() => setShowEFTForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Log EFT Payment
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="EFT Reference"
              value={eftRef}
              onChange={(e) => setEftRef(e.target.value)}
              className="w-full bg-[#0a1628] border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#2ecc71]"
            />
            <input
              type="number"
              placeholder="Amount (ZAR)"
              value={eftAmount}
              onChange={(e) => setEftAmount(e.target.value)}
              className="w-full bg-[#0a1628] border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#2ecc71]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => updateStatus("confirm_eft", { paymentReference: eftRef, paymentAmount: eftAmount })}
                disabled={loading || !eftRef || !eftAmount}
                className="flex-1 bg-[#2ecc71] hover:bg-[#27ae60] disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                {loading ? "…" : "Confirm"}
              </button>
              <button
                onClick={() => setShowEFTForm(false)}
                className="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg border border-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    );
  }

  if (currentStatus === "payment_received") {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => updateStatus("approve_and_go_live")}
          disabled={loading}
          className="bg-[#2ecc71] hover:bg-[#27ae60] disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors font-semibold"
        >
          {loading ? "Processing…" : "Approve & Go Live →"}
        </button>
        <p className="text-slate-500 text-xs text-center">Sends magic links to all drivers</p>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    );
  }

  if (currentStatus === "approved" || currentStatus === "live") {
    return (
      <span className="text-[#2ecc71] text-sm font-medium">✓ Live</span>
    );
  }

  return null;
}
