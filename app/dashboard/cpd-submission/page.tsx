/**
 * GreenFreightAcademy — CPD Submission Page
 *
 * This page creates a bulletin via the existing /api/bulletins/submit endpoint
 * and reuses the fully-wired Paystack payment flow for urgent dispatch.
 *
 * Flow:
 * 1. User fills form (title, category, description, mitigation, visibility, dispatch)
 * 2. POST /api/bulletins/submit → creates bulletin
 * 3. If urgent: POST /api/bulletins/pay → initializes Paystack → redirect to auth URL
 * 4. Paystack redirects to /dashboard/bulletins/payment-complete for verification
 * 5. If standard: bulletin is saved and added to the CPD library queue
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

const CATEGORIES = [
  { value: "safety", label: "Safety" },
  { value: "quality", label: "Quality" },
  { value: "process", label: "Process" },
  { value: "operational", label: "Operational" },
  { value: "compliance", label: "Compliance" },
  { value: "behaviour", label: "Behaviour / Conduct" },
  { value: "other", label: "Other" },
];

type Visibility = "anonymous" | "confidential";
type Dispatch = "urgent" | "standard";

export default function CPDSubmissionPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("anonymous");
  const [dispatch, setDispatch] = useState<Dispatch>("standard");
  const [category, setCategory] = useState("other");
  const [urgentFee, setUrgentFee] = useState<number>(1000);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    incidentTitle: "",
    incidentDescription: "",
    mitigation: "",
  });

  useEffect(() => {
    fetch("/api/admin/settings/bulletin-fee")
      .then((r) => r.json())
      .then((d) => { if (typeof d.fee === "number") setUrgentFee(d.fee); })
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      // 1. Create bulletin via the existing bulletin API
      const submitRes = await fetch("/api/bulletins/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.incidentTitle,
          category,
          description: formData.incidentDescription,
          mitigation_message: formData.mitigation,
          urgency: dispatch,
          confidential: visibility === "confidential",
          waive_fee: false, // urgent always requires payment; standard is free via cpd_library
          audience_type: "all",
          image_urls: [],
          understanding_questions: [],
        }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error || "Submission failed");

      // 2. If urgent dispatch needs payment, initialize Paystack immediately
      if (submitData.needs_payment && submitData.bulletin_id) {
        const payRes = await fetch("/api/bulletins/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bulletin_id: submitData.bulletin_id,
            method: "paystack",
          }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) throw new Error(payData.error || "Payment initialization failed");
        if (payData.authorization_url) {
          window.location.href = payData.authorization_url;
          return; // redirecting — don't reset state
        }
      }

      setSubmitting(false);
      setSubmitted(true);
    } catch (err: any) {
      setSubmitting(false);
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
        <div className="container-gfa" style={{ paddingTop: "5rem", maxWidth: "560px" }}>
          <div
            style={{
              padding: "3rem 2rem",
              background: "rgba(34, 197, 94, 0.05)",
              border: "1px solid rgba(34, 197, 94, 0.15)",
              borderRadius: "1rem",
              textAlign: "center",
            }}
          >
            <CheckCircle2 size={40} style={{ color: "var(--color-green-400)", margin: "0 auto 1rem" }} />
            <h3 style={{ marginBottom: "0.75rem" }}>CPD submission received</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              {dispatch === "urgent"
                ? "Your urgent CPD bulletin has been submitted. If you completed payment, it is ready to disseminate to your driver cohort immediately."
                : "Your contribution has been added to the CPD library for consideration in the next quarterly cycle."}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "2rem" }}>
              {visibility === "anonymous"
                ? "Your submission will be shared anonymously with the CPD community if accepted."
                : "Your submission is confidential and will not be attributed or published."}
            </p>
            <Link href="/dashboard" className="btn-secondary">
              Return to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      {/* Header */}
      <section
        style={{
          padding: "3.5rem 0 3rem",
          background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container-gfa">
          <Link
            href="/dashboard"
            style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.375rem", marginBottom: "1.5rem" }}
          >
            ← Back to dashboard
          </Link>
          <span className="pill-badge pill-green" style={{ marginBottom: "1rem", display: "inline-flex" }}>
            CPD contribution
          </span>
          <h1 style={{ fontSize: "1.75rem", maxWidth: "560px", marginBottom: "0.75rem" }}>
            Submit an incident or mitigation for CPD
          </h1>
          <p style={{ maxWidth: "520px", color: "var(--text-secondary)" }}>
            Real-world incidents and mitigations make CPD relevant and actionable. Your contribution helps
            keep training grounded in operational reality.
          </p>
        </div>
      </section>

      {/* Form */}
      <section style={{ padding: "3rem 0 5rem" }}>
        <div className="container-gfa" style={{ maxWidth: "720px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

            {/* Incident details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", color: "white" }}>Incident or challenge</h3>
              <div>
                <label className="form-label">Category <span style={{ color: "#f87171" }}>*</span></label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-input"
                  required
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Title</label>
                <input
                  type="text"
                  name="incidentTitle"
                  value={formData.incidentTitle}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g. Fatigue-related near-miss on N3 night route"
                  required
                />
              </div>
              <div>
                <label className="form-label">Describe the incident or challenge</label>
                <textarea
                  name="incidentDescription"
                  value={formData.incidentDescription}
                  onChange={handleChange}
                  className="form-input"
                  rows={5}
                  placeholder="Describe what happened, the context, and the risk or impact…"
                  required
                  style={{ resize: "vertical" }}
                />
              </div>
              <div>
                <label className="form-label">Mitigation or recommended response</label>
                <textarea
                  name="mitigation"
                  value={formData.mitigation}
                  onChange={handleChange}
                  className="form-input"
                  rows={4}
                  placeholder="What was done, or what should be done, to prevent recurrence…"
                  required
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>

            {/* Visibility */}
            <div>
              <h3 style={{ fontSize: "1rem", color: "white", marginBottom: "1rem" }}>Visibility</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {(
                  [
                    {
                      value: "anonymous",
                      label: "Share anonymously with the CPD community",
                      description:
                        "If accepted, this incident and mitigation will be published to the shared CPD library with all identifying information removed.",
                    },
                    {
                      value: "confidential",
                      label: "Keep confidential — contribute to library only",
                      description:
                        "Your submission will inform future CPD content but will never be published or attributed to your company.",
                    },
                  ] as { value: Visibility; label: string; description: string }[]
                ).map((option) => (
                  <label
                    key={option.value}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.875rem",
                      padding: "1rem 1.25rem",
                      background: visibility === option.value ? "rgba(34, 197, 94, 0.06)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${visibility === option.value ? "rgba(34, 197, 94, 0.25)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: "0.75rem",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={option.value}
                      checked={visibility === option.value}
                      onChange={() => setVisibility(option.value)}
                      style={{ marginTop: "0.15rem", flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.9rem", color: "white", marginBottom: "0.25rem" }}>
                        {option.label}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Dispatch */}
            <div>
              <h3 style={{ fontSize: "1rem", color: "white", marginBottom: "1rem" }}>Dispatch timing</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {(
                  [
                    {
                      value: "standard",
                      label: "Add to next quarterly CPD cycle",
                      description: "Your submission will be considered for inclusion in the next scheduled quarterly CPD update. No additional fee.",
                      fee: null,
                    },
                    {
                      value: "urgent",
                      label: "Urgent — push to my drivers this month",
                      description: "A priority CPD intervention will be prepared and dispatched to your driver cohort within the current month.",
                      fee: `R ${Math.round(urgentFee * 1.15).toLocaleString()} inc. VAT`,
                    },
                  ] as { value: Dispatch; label: string; description: string; fee: string | null }[]
                ).map((option) => (
                  <label
                    key={option.value}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.875rem",
                      padding: "1rem 1.25rem",
                      background:
                        dispatch === option.value
                          ? option.value === "urgent"
                            ? "rgba(248, 113, 113, 0.06)"
                            : "rgba(34, 197, 94, 0.06)"
                          : "rgba(255,255,255,0.03)",
                      border: `1px solid ${
                        dispatch === option.value
                          ? option.value === "urgent"
                            ? "rgba(248, 113, 113, 0.25)"
                            : "rgba(34, 197, 94, 0.25)"
                          : "rgba(255,255,255,0.08)"
                      }`,
                      borderRadius: "0.75rem",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <input
                      type="radio"
                      name="dispatch"
                      value={option.value}
                      checked={dispatch === option.value}
                      onChange={() => setDispatch(option.value)}
                      style={{ marginTop: "0.15rem", flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "0.25rem" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.9rem", color: "white" }}>
                          {option.label}
                        </div>
                        {option.fee && (
                          <span
                            style={{
                              padding: "0.2rem 0.625rem",
                              background: "rgba(248, 113, 113, 0.12)",
                              color: "#f87171",
                              borderRadius: "0.375rem",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              fontFamily: "var(--font-display)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {option.fee}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {dispatch === "urgent" && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.875rem 1rem",
                    background: "rgba(248, 113, 113, 0.05)",
                    border: "1px solid rgba(248, 113, 113, 0.15)",
                    borderRadius: "0.625rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.625rem",
                  }}
                >
                  <AlertTriangle size={15} style={{ color: "#f87171", marginTop: "0.15rem", flexShrink: 0 }} />
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                    After submitting, you will be directed to complete payment via Paystack. The urgent CPD
                    intervention will be dispatched to your driver cohort once payment is confirmed.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div style={{ padding: "0.875rem 1rem", background: "rgba(248, 113, 113, 0.05)", border: "1px solid rgba(248, 113, 113, 0.2)", borderRadius: "0.625rem", color: "#f87171", fontSize: "0.875rem" }}>
              {error}
            </div>
            )}

            {/* Submit */}
            <div style={{ paddingTop: "0.5rem" }}>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ opacity: submitting ? 0.7 : 1 }}
              >
                {submitting
                  ? "Submitting…"
                  : dispatch === "urgent"
                  ? "Submit and proceed to payment"
                  : "Submit CPD contribution"}
                {!submitting && <ArrowRight size={16} />}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
