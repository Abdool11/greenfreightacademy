"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  deploymentId: string;
  currentStatus: string;
}

type ActivationResult = {
  driversNotified: number;
  invitationsReused: number;
  whatsappSent: number;
  emailSent: number;
};

export default function CohortApprovalActions({ deploymentId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ActivationResult | null>(null);

  async function activateTraining() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/cohorts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deploymentId, action: "approve_and_go_live" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "The cohort could not be activated.");
        return;
      }
      setResult({
        driversNotified: Number(data.driversNotified ?? 0),
        invitationsReused: Number(data.invitationsReused ?? 0),
        whatsappSent: Number(data.whatsappSent ?? 0),
        emailSent: Number(data.emailSent ?? 0),
      });
      router.refresh();
    } catch {
      setError("Network error. No additional activation request was sent.");
    } finally {
      setLoading(false);
    }
  }

  if (currentStatus === "pending_payment") {
    return (
      <div className="flex flex-col gap-2 min-w-[220px]">
        <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200">
          Awaiting finance confirmation of the client&apos;s EFT submission.
        </span>
        <p className="text-center text-xs text-slate-500">
          Finance must reconcile the payment before training can be activated.
        </p>
      </div>
    );
  }

  if (currentStatus === "payment_received") {
    if (result) {
      const deliverySummary = [
        result.whatsappSent ? `${result.whatsappSent} WhatsApp` : "",
        result.emailSent ? `${result.emailSent} email` : "",
      ].filter(Boolean).join(" and ");
      return (
        <div className="flex min-w-[220px] flex-col gap-2">
          <span className="rounded-lg border border-[#2ecc71]/30 bg-[#2ecc71]/10 px-3 py-2 text-center text-xs text-[#86efac]">
            Training activated for {result.driversNotified} driver{result.driversNotified === 1 ? "" : "s"}{deliverySummary ? ` · ${deliverySummary} sent` : ""}.
          </span>
          {result.invitationsReused > 0 && (
            <p className="text-center text-xs text-slate-500">{result.invitationsReused} existing invitation{result.invitationsReused === 1 ? " was" : "s were"} retained; no duplicate message was sent.</p>
          )}
        </div>
      );
    }

    return (
      <div className="flex min-w-[220px] flex-col gap-2">
        <button
          onClick={activateTraining}
          disabled={loading}
          className="rounded-lg bg-[#2ecc71] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#27ae60] disabled:opacity-50"
        >
          {loading ? "Activating training…" : "Activate Training →"}
        </button>
        <p className="text-center text-xs text-slate-500">Creates one invitation per approved driver and sends only new notifications.</p>
        {error && <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">{error}</p>}
      </div>
    );
  }

  if (currentStatus === "approved" || currentStatus === "live") {
    return <span className="text-sm font-medium text-[#2ecc71]">✓ Training live</span>;
  }

  return null;
}
