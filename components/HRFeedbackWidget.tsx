"use client";

import { useState } from "react";
import { Star, Loader2, CheckCircle2 } from "lucide-react";

interface HRFeedbackWidgetProps {
  enrolmentId: string;
  driverName?: string;
  courseName?: string;
  onSubmitted?: () => void;
}

const QUESTIONS = [
  { key: "understanding" as const, label: "I understand the material." },
  { key: "enjoyment" as const, label: "I enjoyed the learning experience." },
  { key: "more_learning" as const, label: "I want to learn more." },
];

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 focus:outline-none"
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          <Star
            size={28}
            className={`transition-colors ${
              star <= (hovered || value)
                ? "text-amber-400 fill-amber-400"
                : "text-gray-600"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function HRFeedbackWidget({
  enrolmentId,
  driverName,
  courseName,
  onSubmitted,
}: HRFeedbackWidgetProps) {
  const [scores, setScores] = useState<Record<string, number>>({
    understanding: 0,
    enjoyment: 0,
    more_learning: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = QUESTIONS.every((q) => scores[q.key] > 0);

  const handleSubmit = async () => {
    if (!allAnswered) { setError("Please rate all three questions before submitting."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/driver/hr-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrolment_id: enrolmentId,
          understanding: scores.understanding,
          enjoyment: scores.enjoyment,
          more_learning: scores.more_learning,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to submit feedback.");
        return;
      }
      setSubmitted(true);
      onSubmitted?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-[#0d1a0d] border border-[#22c55e]/30 rounded-2xl p-6 text-center">
        <CheckCircle2 size={36} className="text-[#22c55e] mx-auto mb-3" />
        <h3 className="text-white font-bold text-lg mb-1">Thank you!</h3>
        <p className="text-gray-400 text-sm">Your feedback has been recorded and will help us improve future programmes.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1a0d] border border-[#1a3a22] rounded-2xl p-6">
      {/* Header */}
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-[#4ade80] mb-1">HR Feedback</div>
        <h3 className="text-white font-bold text-lg">
          {courseName ? `How was ${courseName}?` : "How was your training?"}
        </h3>
        {driverName && (
          <p className="text-gray-500 text-sm mt-0.5">For {driverName}</p>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-5">
        {QUESTIONS.map((q) => (
          <div key={q.key}>
            <p className="text-gray-300 text-sm font-medium mb-2">{q.label}</p>
            <StarInput
              value={scores[q.key]}
              onChange={(v) => setScores((prev) => ({ ...prev, [q.key]: v }))}
            />
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !allAnswered}
        className={`mt-5 w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-colors text-sm ${
          allAnswered
            ? "bg-[#22c55e] hover:bg-[#16a34a] text-black"
            : "bg-[#1a3a22] text-gray-600 cursor-not-allowed"
        }`}
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
        Submit Feedback
      </button>
    </div>
  );
}
