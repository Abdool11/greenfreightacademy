"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CreditCard, Building2, CheckCircle2, AlertTriangle } from "lucide-react";

interface Course {
  id: string;
  name: string;
  slug?: string;
  price_corporate?: number;
}

interface BuyCreditsModalProps {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  onQuoteCreated?: () => void;
}

export default function BuyCreditsModal({ open, onClose, courses, onQuoteCreated }: BuyCreditsModalProps) {
  const [step, setStep] = useState<"form" | "quote" | "eft" | "paying">("form");
  const [numDrivers, setNumDrivers] = useState(1);
  const [courseId, setCourseId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<{ quoteId: string; reference: string; total: number; lineItems: Array<{ price: number }> } | null>(null);

  // Auto-select the available course when modal opens
  useEffect(() => {
    if (open) {
      const available = courses.find(c => c.slug === "ptdp");
      if (available) setCourseId(available.id);
    }
  }, [open, courses]);

  if (!open) return null;

  const selectedCourse = courses.find(c => c.id === courseId);
  const pricePerDriver = selectedCourse?.price_corporate ?? 0;
  const subtotal = pricePerDriver * numDrivers;
  const vat = Math.round(subtotal * 0.15 * 100) / 100;
  const total = subtotal + vat;

  function handleClose() {
    setStep("form");
    setNumDrivers(1);
    setCourseId("");
    setError("");
    setQuote(null);
    onClose();
  }

  async function handleGetQuote() {
    if (!courseId) { setError("Please select a course"); return; }
    if (numDrivers < 1) { setError("Please enter at least 1 driver"); return; }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/company/quote/simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numDrivers, courseId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create quote"); return; }
      setQuote({ quoteId: data.quoteId, reference: data.reference, total: data.total, lineItems: data.lineItems });
      setStep("quote");
      onQuoteCreated?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayByCard() {
    if (!quote) return;
    setStep("paying");
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.quoteId }),
      });
      const data = await res.json();
      if (res.ok && data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setError(data.error || "Payment initialization failed. Please try again.");
        setStep("quote");
      }
    } catch {
      setError("Network error. Please try again.");
      setStep("quote");
    }
  }

  async function handlePayByEFT() {
    if (!quote) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/company/quote/simple", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.quoteId, method: "eft" }),
      });
      if (res.ok) {
        setStep("eft");
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to submit EFT notification");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

      <div className="relative bg-[#111f3a] border border-slate-700/50 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <h2 className="text-white font-semibold text-lg">
            {step === "form" && "Get an Instant Quote"}
            {step === "quote" && "Your Quote"}
            {step === "eft" && "EFT Payment Instructions"}
            {step === "paying" && "Processing..."}
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form step */}
        {step === "form" && (
          <div className="p-5 space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                <AlertTriangle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">
                How many drivers do you want to train?
              </label>
              <input
                type="number"
                min={1}
                value={numDrivers}
                onChange={(e) => setNumDrivers(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-[#0a1628] border border-slate-700/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#2ecc71]"
                placeholder="Enter number of drivers"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5">
                Select a training course
              </label>
              <div className="space-y-2">
                {courses.map(c => {
                  const isAvailable = c.slug === "ptdp";
                  const isSelected = courseId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => isAvailable && setCourseId(c.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                        isSelected
                          ? "course-selected bg-[#2ecc71]/15 border border-[#2ecc71]/50 text-white"
                          : isAvailable
                            ? "bg-[#0a1628] border border-slate-700/50 text-slate-300 hover:border-[#2ecc71]/30"
                            : "bg-[#0a1628] border border-slate-800/50 text-slate-600 cursor-not-allowed"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isSelected && <CheckCircle2 size={16} className="text-[#2ecc71]" />}
                        {c.name}
                        {!isAvailable && (
                          <span className="text-[0.625rem] font-semibold uppercase tracking-wide bg-slate-700/50 text-slate-500 px-1.5 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        )}
                      </span>
                      {isAvailable && (
                        <span className="text-slate-400 text-xs">
                          R {Number(c.price_corporate ?? 0).toFixed(2)} / driver
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedCourse && (
              <div className="bg-[#0a1628] border border-slate-700/30 rounded-lg p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Drivers</span>
                  <span className="text-white font-medium">{numDrivers}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Price per driver</span>
                  <span className="text-white font-medium">R {pricePerDriver.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-white font-medium">R {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">VAT (15%)</span>
                  <span className="text-white font-medium">R {vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-slate-700/30">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-[#2ecc71] font-bold">R {total.toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleGetQuote}
              disabled={submitting || !courseId}
              className="w-full bg-[#2ecc71] hover:bg-[#27ae60] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating Quote...
                </>
              ) : (
                "Get Quote"
              )}
            </button>
          </div>
        )}

        {/* Quote step — show quote with payment options */}
        {step === "quote" && quote && (
          <div className="p-5 space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                <AlertTriangle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="bg-[#0a1628] border border-slate-700/30 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-400 text-sm">Quote Reference</span>
                <span className="text-white font-mono text-sm">{quote.reference}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm">Credits to purchase</span>
                <span className="text-white font-medium">{quote.lineItems.length}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-700/30">
                <span className="text-white font-semibold">Total Due</span>
                <span className="text-[#2ecc71] font-bold text-lg">R {quote.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-slate-400 text-sm text-center">Choose your payment method:</p>

              <button
                onClick={handlePayByCard}
                disabled={submitting}
                className="w-full bg-[#2ecc71] hover:bg-[#27ae60] disabled:opacity-50 text-white py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard size={18} />
                Pay by Card (Instant)
              </button>

              <button
                onClick={handlePayByEFT}
                disabled={submitting}
                className="w-full bg-[#0a1628] hover:bg-slate-800 border border-slate-700/50 text-white py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Building2 size={18} />
                Pay by EFT (Nedbank Account)
              </button>
            </div>
          </div>
        )}

        {/* EFT step — show bank details */}
        {step === "eft" && quote && (
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-3 bg-[#2ecc71]/10 border border-[#2ecc71]/30 rounded-lg p-4">
              <CheckCircle2 size={24} className="text-[#2ecc71] flex-shrink-0" />
              <div>
                <p className="text-white font-medium text-sm">Nedbank EFT Payment Recorded</p>
                <p className="text-slate-400 text-xs mt-0.5">We&apos;ve emailed you the Nedbank account details and notified our team.</p>
              </div>
            </div>

            <div className="bg-[#0a1628] border border-slate-700/30 rounded-lg p-4 space-y-2">
              <p className="text-slate-400 text-xs font-medium uppercase mb-2">Nedbank Banking Details</p>
              <p className="text-slate-400 text-sm">Please check your email for full banking details and use this reference:</p>
              <div className="bg-[#111f3a] rounded-lg p-3 mt-2">
                <p className="text-slate-500 text-xs">Payment Reference:</p>
                <p className="text-white font-mono font-bold">{quote.reference}</p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-amber-400 text-sm">
                After making your EFT payment, email your proof of payment to our team.
                Once verified, your credits will be activated and you can deploy training.
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {/* Paying step */}
        {step === "paying" && (
          <div className="p-8 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-[#2ecc71]" />
            <p className="text-slate-400 text-sm">Redirecting to secure payment...</p>
          </div>
        )}
      </div>
    </div>
  );
}
