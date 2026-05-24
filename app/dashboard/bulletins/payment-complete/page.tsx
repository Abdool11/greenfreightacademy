"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type Status = "verifying" | "success" | "failed";

export default function PaymentCompleteClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bulletinId = searchParams.get("bulletin_id");
  const ref = searchParams.get("ref");

  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bulletinId || !ref) {
      setStatus("failed");
      setError("Missing payment reference.");
      return;
    }

    // Verify the payment with Paystack
    fetch(`/api/paystack/verify?reference=${encodeURIComponent(ref)}&bulletin_id=${encodeURIComponent(bulletinId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setStatus("success");
        } else {
          setStatus("failed");
          setError(data.error || "Payment verification failed.");
        }
      })
      .catch(() => {
        setStatus("failed");
        setError("Could not connect to payment server.");
      });
  }, [bulletinId, ref]);

  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-[#060e1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying your payment…</p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="min-h-screen bg-[#060e1a] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-[#0a1628] border border-red-500/30 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Payment not confirmed</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <Link
            href="/dashboard/bulletins"
            className="inline-block bg-[#1a3a22] hover:bg-[#22c55e] text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
          >
            Back to bulletins
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060e1a] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#0a1628] border border-[#1a3a22] rounded-2xl p-8 text-center">
        <div className="w-14 h-14 bg-[#1a3a22] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[#4ade80]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Payment confirmed</h2>
        <p className="text-gray-400 text-sm mb-6">
          Your urgent bulletin has been paid for and is ready to disseminate to your drivers.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href={`/dashboard/bulletins?disseminate=${bulletinId}`}
            className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            Disseminate now
          </Link>
          <Link
            href="/dashboard/campaigns"
            className="border border-[#1a3a22] text-gray-300 hover:text-white px-6 py-2.5 rounded-xl transition-colors"
          >
            View campaigns
          </Link>
        </div>
      </div>
    </div>
  );
}
