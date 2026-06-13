/**
 * GreenFreightAcademy — CPD Submission Page
 *
 * DATA REQUIREMENTS:
 * - Form submission: Server Action → POST /api/cpd-submission
 *   Payload: {
 *     companyId: string,
 *     incidentTitle: string,
 *     incidentDescription: string,
 *     mitigation: string,
 *     visibility: "anonymous" | "confidential",
 *     dispatch: "urgent" | "standard",
 *     urgentFeePaid?: boolean,
 *   }
 * - If dispatch === "urgent": redirect to Paystack payment for URGENT_CPD_FEE_ZAR
 *   TODO: Asif to implement Paystack payment flow
 * - Supabase table: cpd_submissions
 *   Fields: id, company_id, incident_title, incident_description, mitigation,
 *           visibility, dispatch, status (submitted|under_review|accepted|in_development|published),
 *           urgent_fee_paid, created_at
 * - Email notification to admin on new submission
 *   TODO: Asif to implement edge function trigger
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertTriangle, Info } from "lucide-react";
// URGENT_CPD_FEE_LABEL removed — fee to be confirmed by Asif when Paystack is integrated

type Visibility = "anonymous" | "confidential";
type Dispatch = "urgent" | "standard";

export default function CPDSubmissionPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("anonymous");
  const [dispatch, setDispatch] = useState<Dispatch>("standard");
  const [formData, setFormData] = useState({
    incidentTitle: "",
    incidentDescription: "",
    mitigation: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // TODO: Asif to implement:
    // 1. Server Action that POSTs to /api/cpd-submission
    // 2. If dispatch === "urgent", redirect to Paystack payment
    // 3. On payment success, mark urgent_fee_paid = true and notify admin
    // 4. If dispatch === "standard", save to Supabase and notify admin
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
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
                ? "Your urgent CPD request has been submitted. Our team will be in touch to confirm dispatch within your driver cohort this month."
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
                      fee: "Fee to be confirmed", // TODO: Asif — set price once Paystack is integrated
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
                    {/* TODO: Asif to implement Paystack redirect on urgent dispatch */}
                  </p>
                </div>
              )}
            </div>

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
