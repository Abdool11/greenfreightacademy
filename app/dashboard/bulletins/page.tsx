"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Upload, X, Loader2, ImageIcon, Zap, BookOpen, CreditCard, FileText, CheckCircle2
} from "lucide-react";
import BulletinWhatsAppFieldSelector, { type BulletinNotificationField } from "@/components/BulletinWhatsAppFieldSelector";

const CATEGORIES = [
  { value: "safety", label: "Safety" },
  { value: "quality", label: "Quality" },
  { value: "process", label: "Process" },
  { value: "operational", label: "Operational" },
  { value: "compliance", label: "Compliance" },
  { value: "behaviour", label: "Behaviour / Conduct" },
  { value: "other", label: "Other" },
];

type Step = "form" | "audience" | "review" | "payment" | "submitted";

interface UploadedImage {
  publicUrl: string;
  path: string;
  previewUrl: string;
  filename: string;
}

interface FormData {
  title: string;
  category: string;
  date_observed: string;
  description: string;
  why_it_matters: string;
  mitigation_message: string;
  driver_action: string;
  urgency: "standard" | "urgent";
  waive_fee: boolean;
  audience_type: "all" | "branch" | "custom";
  confidential: boolean;
  understanding_questions: { question: string; options: string[]; correct_answer: number }[];
  images: UploadedImage[];
}

const defaultForm: FormData = {
  title: "",
  category: "",
  date_observed: "",
  description: "",
  why_it_matters: "",
  mitigation_message: "",
  driver_action: "",
  urgency: "standard",
  waive_fee: false,
  audience_type: "all",
  confidential: true,
  understanding_questions: [{ question: "", options: ["", "", ""], correct_answer: 0 }],
  images: [],
};

const STEP_LABELS = [
  { key: "form", label: "Issue details" },
  { key: "audience", label: "Urgency & audience" },
  { key: "review", label: "Review & submit" },
];

export default function BulletinsPage() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [urgentFee, setUrgentFee] = useState<number>(1000);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "invoice">("paystack");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [notificationFields, setNotificationFields] = useState<BulletinNotificationField[]>(["title", "urgency", "driver_action", "portal_link"]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/settings/bulletin-fee")
      .then((r) => r.json())
      .then((d) => { if (d.fee) setUrgentFee(Number(d.fee)); })
      .catch(() => {});
  }, []);

  const update = (field: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateQuestion = (idx: number, field: string, value: any) => {
    const qs = [...form.understanding_questions];
    qs[idx] = { ...qs[idx], [field]: value };
    update("understanding_questions", qs);
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const qs = [...form.understanding_questions];
    const opts = [...qs[qIdx].options];
    opts[oIdx] = value;
    qs[qIdx] = { ...qs[qIdx], options: opts };
    update("understanding_questions", qs);
  };

  const addQuestion = () => {
    if (form.understanding_questions.length < 3) {
      update("understanding_questions", [
        ...form.understanding_questions,
        { question: "", options: ["", "", ""], correct_answer: 0 },
      ]);
    }
  };

  const removeQuestion = (idx: number) => {
    update("understanding_questions", form.understanding_questions.filter((_, i) => i !== idx));
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (form.images.length >= 3) {
      setError("Maximum 3 images allowed per bulletin.");
      return;
    }
    const remaining = 3 - form.images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    setUploadingImage(true);
    setError("");
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of toUpload) {
        if (file.size > 5 * 1024 * 1024) {
          setError(`${file.name} exceeds the 5 MB limit.`);
          continue;
        }
        const urlRes = await fetch("/api/bulletins/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });
        const urlData = await urlRes.json();
        if (!urlRes.ok) throw new Error(urlData.error || "Failed to get upload URL");
        const uploadRes = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) throw new Error("Image upload failed");
        uploaded.push({
          publicUrl: urlData.publicUrl,
          path: urlData.path,
          previewUrl: URL.createObjectURL(file),
          filename: file.name,
        });
      }
      update("images", [...form.images, ...uploaded]);
    } catch (err: any) {
      setError(err.message || "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (idx: number) => {
    update("images", form.images.filter((_, i) => i !== idx));
  };

  // Derive distribution from urgency + waiver
  const getDistribution = () => {
    if (form.urgency === "standard") return "cpd_library";
    if (form.waive_fee) return "both";
    return "company_only";
  };

  const needsPayment = form.urgency === "urgent" && !form.waive_fee;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bulletins/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          date_observed: form.date_observed,
          description: form.description,
          why_it_matters: form.why_it_matters,
          mitigation_message: form.mitigation_message,
          driver_action: form.driver_action,
          urgency: form.urgency,
          distribution: getDistribution(),
          audience_type: form.audience_type,
          confidential: form.confidential,
          image_urls: form.images.map((img) => img.publicUrl),
          understanding_questions: form.understanding_questions.filter((q) => q.question.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setResult(data);
      if (needsPayment) {
        setStep("payment");
      } else {
        setStep("submitted");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!result?.bulletin_id) return;
    setPaymentProcessing(true);
    setError("");
    try {
      const res = await fetch("/api/bulletins/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulletin_id: result.bulletin_id, method: paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      if (paymentMethod === "paystack" && data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setStep("submitted");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleDisseminate = async () => {
    if (!result?.bulletin_id) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bulletins/disseminate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulletin_id: result.bulletin_id, notification_fields: notificationFields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult((prev: any) => ({ ...prev, ...data, disseminated: true }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Payment step ──────────────────────────────────────────────────────────
  if (step === "payment") {
    const total = Math.round(urgentFee * 1.15);
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-[#0d1f14] border border-[#1a3a22] rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
              <Zap size={18} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Urgent bulletin fee</h2>
              <p className="text-gray-400 text-sm">Your bulletin has been saved and is ready to send.</p>
            </div>
          </div>

          <div className="bg-[#0d1a0d] border border-[#1a3a22] rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400 text-sm">Urgent bulletin fee (excl. VAT)</span>
              <span className="text-2xl font-bold text-white">R {urgentFee.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>VAT (15%)</span>
              <span>R {Math.round(urgentFee * 0.15).toLocaleString()}</span>
            </div>
            <div className="border-t border-[#1a3a22] mt-3 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-300">Total</span>
              <span className="text-lg font-bold text-[#4ade80]">R {total.toLocaleString()}</span>
            </div>
          </div>

          <p className="text-sm text-gray-400 mb-4">How would you like to settle this?</p>

          <div className="space-y-3 mb-6">
            <label
              className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === "paystack" ? "border-[#22c55e] bg-[#22c55e]/5" : "border-[#1a3a22] hover:border-[#22c55e]/40"}`}
              onClick={() => setPaymentMethod("paystack")}
            >
              <input type="radio" name="payment" value="paystack" checked={paymentMethod === "paystack"} onChange={() => setPaymentMethod("paystack")} className="mt-1 accent-[#22c55e]" />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <CreditCard size={15} className="text-[#22c55e]" />
                  <span className="text-sm font-semibold text-white">Pay now by card</span>
                </div>
                <p className="text-xs text-gray-400">Secure card payment via Paystack. Bulletin is disseminated immediately after payment.</p>
              </div>
            </label>

            <label
              className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === "invoice" ? "border-[#22c55e] bg-[#22c55e]/5" : "border-[#1a3a22] hover:border-[#22c55e]/40"}`}
              onClick={() => setPaymentMethod("invoice")}
            >
              <input type="radio" name="payment" value="invoice" checked={paymentMethod === "invoice"} onChange={() => setPaymentMethod("invoice")} className="mt-1 accent-[#22c55e]" />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <FileText size={15} className="text-gray-300" />
                  <span className="text-sm font-semibold text-white">Add to monthly invoice</span>
                </div>
                <p className="text-xs text-gray-400">This amount will appear on your next monthly invoice. Bulletin is disseminated immediately.</p>
              </div>
            </label>
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("review")}
              className="border border-[#1a3a22] text-gray-300 hover:text-white px-5 py-3 rounded-xl transition-colors text-sm"
            >
              ← Back
            </button>
            <button
              onClick={handlePayment}
              disabled={paymentProcessing}
              className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {paymentProcessing ? (
                <><Loader2 size={16} className="animate-spin" /> Processing…</>
              ) : paymentMethod === "paystack" ? (
                <><CreditCard size={16} /> Pay R {total.toLocaleString()} &amp; send bulletin</>
              ) : (
                <><FileText size={16} /> Invoice me &amp; send bulletin</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Submitted step ────────────────────────────────────────────────────────
  if (step === "submitted") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-[#0d1f14] border border-[#1a3a22] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-[#1a3a22] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#4ade80]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Bulletin submitted</h2>
          {form.urgency === "urgent" && (
            <p className="text-amber-400 font-medium mb-2">Urgent bulletin — SLA: disseminated within 40 hours</p>
          )}
          {form.urgency === "standard" && (
            <p className="text-[#4ade80] text-sm mb-2">
              This bulletin will be shared with the GFA community CPD library for quarterly publication.
            </p>
          )}
          {form.urgency === "urgent" && form.waive_fee && (
            <p className="text-[#4ade80] text-sm mb-2">
              Fee waived — submitted to GFA CPD library approval queue.
            </p>
          )}

          {!result?.disseminated ? (
            <>
              <p className="text-gray-400 mb-6 mt-4">
                Your bulletin has been saved. Click below to disseminate it to your selected drivers now.
              </p>
              {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}
              <button
                onClick={handleDisseminate}
                disabled={submitting}
                className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-8 py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {submitting ? "Disseminating…" : "Disseminate to drivers now"}
              </button>
            </>
          ) : (
            <>
              <p className="text-[#4ade80] font-medium mb-2 mt-4">
                Disseminated to {result.drivers_targeted} driver{result.drivers_targeted !== 1 ? "s" : ""}
              </p>
              {result.whatsapp_sent > 0 && (
                <p className="text-gray-400 text-sm mb-6">
                  {result.whatsapp_sent} WhatsApp notification{result.whatsapp_sent !== 1 ? "s" : ""} sent
                </p>
              )}
              <div className="flex gap-3 justify-center mt-4">
                <Link
                  href="/dashboard/campaigns"
                  className="bg-[#1a3a22] hover:bg-[#22c55e] text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
                >
                  View campaign report
                </Link>
                <button
                  onClick={() => { setForm(defaultForm); setStep("form"); setResult(null); }}
                  className="border border-[#1a3a22] text-gray-300 hover:text-white px-6 py-2.5 rounded-xl transition-colors"
                >
                  New bulletin
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Wizard steps ──────────────────────────────────────────────────────────
  const stepIndex = ["form", "audience", "review"].indexOf(step);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#4ade80]">
          CPD &amp; Driver Bulletins
        </span>
        <h1 className="text-3xl font-bold text-white mt-1 mb-2">New Driver Bulletin</h1>
        <p className="text-gray-400">
          Standard bulletins are always free and automatically contributed to the GFA community CPD library. Urgent bulletins are private to your drivers and carry a fee — waivable by opting into the CPD library.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEP_LABELS.map(({ key, label }, i) => {
          const active = i <= stepIndex;
          const current = key === step;
          return (
            <div key={key} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 ${current ? "text-white" : active ? "text-[#4ade80]" : "text-gray-600"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${current ? "bg-[#22c55e] text-black" : active ? "bg-[#1a3a22] text-[#4ade80]" : "bg-[#0d1a0d] text-gray-600"}`}>
                  {i + 1}
                </div>
                <span className="text-sm hidden sm:block">{label}</span>
              </div>
              {i < 2 && <div className={`w-8 h-px ${active ? "bg-[#22c55e]" : "bg-[#1a2a1a]"}`} />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1 — Issue details ── */}
      {step === "form" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Issue title <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Tyre blowout on N3 — driver response procedure"
                className="w-full bg-[#0d1a0d] border border-[#1a3a22] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Category <span className="text-red-400">*</span></label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="w-full bg-[#0d1a0d] border border-[#1a3a22] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e] transition-colors"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Date observed</label>
              <input
                type="date"
                value={form.date_observed}
                onChange={(e) => update("date_observed", e.target.value)}
                className="w-full bg-[#0d1a0d] border border-[#1a3a22] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Short description of the issue <span className="text-red-400">*</span></label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              placeholder="Describe what happened or what the issue is. Keep it factual and clear."
              className="w-full bg-[#0d1a0d] border border-[#1a3a22] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Why this matters</label>
            <textarea
              value={form.why_it_matters}
              onChange={(e) => update("why_it_matters", e.target.value)}
              rows={2}
              placeholder="What is the risk, impact, or consequence if this is not addressed?"
              className="w-full bg-[#0d1a0d] border border-[#1a3a22] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Key mitigation or message to drivers <span className="text-red-400">*</span></label>
            <textarea
              value={form.mitigation_message}
              onChange={(e) => update("mitigation_message", e.target.value)}
              rows={3}
              placeholder="What should drivers know, understand, or do differently? This is the core of the bulletin."
              className="w-full bg-[#0d1a0d] border border-[#1a3a22] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Desired driver action or awareness outcome</label>
            <input
              type="text"
              value={form.driver_action}
              onChange={(e) => update("driver_action", e.target.value)}
              placeholder="e.g. Drivers should check tyre pressure before departure on all long-haul routes"
              className="w-full bg-[#0d1a0d] border border-[#1a3a22] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] transition-colors"
            />
          </div>

          {/* Understanding questions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">
                Understanding check questions <span className="text-gray-500 font-normal">(optional, max 3)</span>
              </label>
              {form.understanding_questions.length < 3 && (
                <button onClick={addQuestion} className="text-xs text-[#22c55e] hover:text-[#4ade80] transition-colors">
                  + Add question
                </button>
              )}
            </div>
            <div className="space-y-4">
              {form.understanding_questions.map((q, qIdx) => (
                <div key={qIdx} className="bg-[#0d1a0d] border border-[#1a3a22] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestion(qIdx, "question", e.target.value)}
                      placeholder={`Question ${qIdx + 1}`}
                      className="flex-1 bg-transparent border-b border-[#1a3a22] pb-1 text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] transition-colors text-sm"
                    />
                    {form.understanding_questions.length > 1 && (
                      <button onClick={() => removeQuestion(qIdx)} className="text-gray-600 hover:text-red-400 transition-colors mt-0.5">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qIdx}`}
                          checked={q.correct_answer === oIdx}
                          onChange={() => updateQuestion(qIdx, "correct_answer", oIdx)}
                          className="accent-[#22c55e]"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                          placeholder={`Option ${oIdx + 1}${q.correct_answer === oIdx ? " (correct)" : ""}`}
                          className="flex-1 bg-transparent border-b border-[#0d2a1a] pb-0.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#22c55e] transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Select the radio button next to the correct answer.</p>
                </div>
              ))}
            </div>
          </div>

          {/* Image upload */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">
                Supporting images <span className="text-gray-500 font-normal">(optional, max 3 — JPEG/PNG/WebP, up to 5 MB each)</span>
              </label>
              <span className="text-xs text-gray-500">{form.images.length} / 3</span>
            </div>

            {form.images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-[#1a3a22] aspect-video bg-[#0d1a0d]">
                    <img src={img.previewUrl} alt={img.filename} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/70 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {form.images.length < 3 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#1a3a22] hover:border-[#22c55e]/50 rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                {uploadingImage ? (
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Uploading…</span>
                  </div>
                ) : (
                  <>
                    <ImageIcon size={24} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-sm text-gray-400">Click to upload images</p>
                    <p className="text-xs text-gray-600 mt-1">Up to {3 - form.images.length} more image{3 - form.images.length !== 1 ? "s" : ""}</p>
                  </>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                if (!form.title || !form.category || !form.description || !form.mitigation_message) {
                  setError("Please fill in all required fields: title, category, description, and mitigation message.");
                  return;
                }
                setError("");
                setStep("audience");
              }}
              className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              Urgency &amp; audience →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2 — Urgency & Audience ── */}
      {step === "audience" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Bulletin type</h2>
            <p className="text-gray-400 text-sm mb-4">
              Standard bulletins are always free and automatically go to the GFA CPD library. Urgent bulletins are private to your drivers and carry a fee — which is waived if you opt into the CPD library.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Standard */}
              <label
                className={`flex flex-col gap-3 p-5 rounded-xl border cursor-pointer transition-colors ${form.urgency === "standard" ? "border-[#22c55e] bg-[#22c55e]/5" : "border-[#1a3a22] hover:border-[#22c55e]/40"}`}
                onClick={() => { update("urgency", "standard"); update("waive_fee", false); }}
              >
                <div className="flex items-start gap-3">
                  <input type="radio" name="urgency" value="standard" checked={form.urgency === "standard"} onChange={() => { update("urgency", "standard"); update("waive_fee", false); }} className="mt-1 accent-[#22c55e]" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen size={15} className="text-[#22c55e]" />
                      <span className="font-semibold text-white">Standard bulletin</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Shared with your drivers and automatically contributed to the GFA community CPD library for quarterly publication.
                    </p>
                  </div>
                </div>
                <div className="ml-6 flex items-center justify-between border-t border-[#1a3a22] pt-2">
                  <span className="text-xs text-gray-500">Fee</span>
                  <span className="text-sm font-bold text-[#4ade80]">Free</span>
                </div>
              </label>

              {/* Urgent */}
              <label
                className={`flex flex-col gap-3 p-5 rounded-xl border cursor-pointer transition-colors ${form.urgency === "urgent" ? "border-amber-500/60 bg-amber-500/5" : "border-[#1a3a22] hover:border-amber-500/30"}`}
                onClick={() => update("urgency", "urgent")}
              >
                <div className="flex items-start gap-3">
                  <input type="radio" name="urgency" value="urgent" checked={form.urgency === "urgent"} onChange={() => update("urgency", "urgent")} className="mt-1 accent-amber-400" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={15} className="text-amber-400" />
                      <span className="font-semibold text-white">Urgent bulletin</span>
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Priority</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Private to your drivers. Daily reminders until acknowledged. SLA: disseminated within 40 hours.
                    </p>
                  </div>
                </div>
                <div className="ml-6 flex items-center justify-between border-t border-[#1a3a22] pt-2">
                  <span className="text-xs text-gray-500">Fee</span>
                  <span className={`text-sm font-bold ${form.urgency === "urgent" && form.waive_fee ? "line-through text-gray-500" : "text-amber-400"}`}>
                    R {urgentFee.toLocaleString()} <span className="text-xs font-normal text-gray-500">excl. VAT</span>
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Waiver option — urgent only */}
          {form.urgency === "urgent" && (
            <div className={`rounded-xl border p-5 transition-colors ${form.waive_fee ? "border-[#22c55e] bg-[#22c55e]/5" : "border-[#1a3a22]"}`}>
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.waive_fee}
                  onChange={(e) => update("waive_fee", e.target.checked)}
                  className="mt-1 accent-[#22c55e]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <BookOpen size={14} className="text-[#22c55e]" />
                    <span className="text-sm font-semibold text-white">Waive fee — contribute to CPD library</span>
                    <span className="text-xs bg-[#22c55e]/20 text-[#4ade80] px-2 py-0.5 rounded-full font-medium">Fee waived</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    By opting in, your urgent bulletin will also be submitted to GFA for review and potential inclusion in the quarterly CPD bulletin sent to all registered drivers. The R {urgentFee.toLocaleString()} fee is fully waived.
                  </p>
                  {form.waive_fee && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="anon"
                        checked={form.confidential}
                        onChange={(e) => update("confidential", e.target.checked)}
                        className="accent-[#22c55e]"
                      />
                      <label htmlFor="anon" className="text-xs text-gray-400 cursor-pointer">
                        Contribute anonymously — do not show my company name in the CPD library
                      </label>
                    </div>
                  )}
                </div>
              </label>
            </div>
          )}

          {/* WhatsApp notification fields */}
          <div className="bg-[#0d1a0d] border border-[#1a3a22] rounded-xl p-5">
            <BulletinWhatsAppFieldSelector
              selected={notificationFields}
              onChange={setNotificationFields}
              driverName="Sipho"
              bulletinTitle={form.title || "Tyre pressure check procedure"}
              urgency={form.urgency}
              driverAction={form.driver_action || "Check all tyre pressures before departure"}
            />
          </div>

          {/* Audience */}
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Target audience</h2>
            <p className="text-gray-400 text-sm mb-4">Which drivers should receive this bulletin?</p>
            <div className="space-y-3">
              {[
                { value: "all", label: "All drivers", desc: "Every driver linked to your company account." },
                { value: "branch", label: "By branch / depot", desc: "Select one or more branches." },
                { value: "custom", label: "Custom selection", desc: "Hand-pick specific drivers." },
              ].map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${form.audience_type === value ? "border-[#22c55e] bg-[#22c55e]/5" : "border-[#1a3a22] hover:border-[#22c55e]/40"}`}
                  onClick={() => update("audience_type", value as any)}
                >
                  <input type="radio" name="audience" value={value} checked={form.audience_type === value} onChange={() => update("audience_type", value as any)} className="mt-1 accent-[#22c55e]" />
                  <div>
                    <div className="text-sm font-medium text-white">{label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep("form")}
              className="border border-[#1a3a22] text-gray-300 hover:text-white px-6 py-3 rounded-xl transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep("review")}
              className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              Review &amp; submit →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3 — Review ── */}
      {step === "review" && (
        <div className="space-y-6">
          <div className="bg-[#0d1a0d] border border-[#1a3a22] rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <h3 className="text-lg font-bold text-white">{form.title}</h3>
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${form.urgency === "urgent" ? "bg-amber-500/20 text-amber-400" : "bg-[#1a3a22] text-[#4ade80]"}`}>
                  {form.urgency === "urgent" ? "Urgent bulletin" : "Standard"}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-[#1a3a22] text-gray-300 capitalize">
                  {form.category}
                </span>
              </div>
            </div>

            {/* Fee summary */}
            {form.urgency === "urgent" && (
              <div className={`flex items-center justify-between p-3 rounded-lg ${form.waive_fee ? "bg-[#22c55e]/10 border border-[#22c55e]/30" : "bg-amber-500/10 border border-amber-500/30"}`}>
                <div className="flex items-center gap-2">
                  {form.waive_fee ? <BookOpen size={14} className="text-[#22c55e]" /> : <Zap size={14} className="text-amber-400" />}
                  <span className="text-sm text-gray-300">
                    {form.waive_fee ? "Fee waived — contributing to CPD library" : "Urgent bulletin fee applies"}
                  </span>
                </div>
                <span className={`text-sm font-bold ${form.waive_fee ? "text-[#4ade80]" : "text-amber-400"}`}>
                  {form.waive_fee ? "Free" : `R ${urgentFee.toLocaleString()} excl. VAT`}
                </span>
              </div>
            )}
            {form.urgency === "standard" && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30">
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-[#22c55e]" />
                  <span className="text-sm text-gray-300">Standard — shared to CPD library</span>
                </div>
                <span className="text-sm font-bold text-[#4ade80]">Free</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Audience</span>
                <p className="text-white capitalize">{form.audience_type.replace("_", " ")} drivers</p>
              </div>
              {form.date_observed && (
                <div>
                  <span className="text-gray-500">Date observed</span>
                  <p className="text-white">{form.date_observed}</p>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Description</span>
              <p className="text-gray-300 text-sm mt-1">{form.description}</p>
            </div>
            {form.why_it_matters && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Why it matters</span>
                <p className="text-gray-300 text-sm mt-1">{form.why_it_matters}</p>
              </div>
            )}
            <div className="bg-[#0d1f14] border border-[#1a3a22] rounded-xl p-4">
              <span className="text-xs text-[#4ade80] uppercase tracking-wide font-semibold">Key mitigation message</span>
              <p className="text-white text-sm mt-1">{form.mitigation_message}</p>
            </div>
            {form.driver_action && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Driver action</span>
                <p className="text-gray-300 text-sm mt-1">{form.driver_action}</p>
              </div>
            )}

            {/* Image previews */}
            {form.images.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  {form.images.length} supporting image{form.images.length !== 1 ? "s" : ""}
                </span>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="rounded-lg overflow-hidden border border-[#1a3a22] aspect-video bg-[#0d1a0d]">
                      <img src={img.previewUrl} alt={img.filename} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.understanding_questions.filter((q) => q.question.trim()).length > 0 && (
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  Understanding check — {form.understanding_questions.filter((q) => q.question.trim()).length} question{form.understanding_questions.filter((q) => q.question.trim()).length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep("audience")}
              className="border border-[#1a3a22] text-gray-300 hover:text-white px-6 py-3 rounded-xl transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Submitting…</>
              ) : needsPayment ? (
                "Submit & proceed to payment →"
              ) : (
                "Submit bulletin"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
