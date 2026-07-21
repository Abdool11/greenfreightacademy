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
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  async function confirmApproval() {
    setShowConfirm(false);
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
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.refresh();
      }, 2000);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className="bg-[#2ecc71] hover:bg-[#27ae60] disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? "Processing…" : "Approve Payment"}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
          <div
            className="bg-[#111f3a] border border-slate-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg">Confirm Payment</h3>
            </div>
            <p className="text-slate-400 text-sm mb-1">
              Are you sure you want to confirm this payment?
            </p>
            <div className="bg-[#0a1628] rounded-lg p-3 mb-5 text-sm">
              <div className="text-slate-400 text-xs">Company</div>
              <div className="text-white font-medium">{companyName}</div>
              <div className="text-slate-400 text-xs mt-2">Quote Reference</div>
              <div className="text-white font-mono">{quoteReference}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmApproval}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#2ecc71] hover:bg-[#27ae60] text-white text-sm font-medium transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success dialog */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111f3a] border border-[#2ecc71]/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-[#2ecc71]/20 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-[#2ecc71]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg mb-1">Payment Confirmed</h3>
              <p className="text-slate-400 text-sm">
                Payment for {companyName} has been successfully approved.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
