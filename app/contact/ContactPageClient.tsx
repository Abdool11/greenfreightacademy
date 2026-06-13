"use client";
export const dynamic = "force-dynamic";
/**
 * GreenFreightAcademy — Contact / Enquiry Page
 *
 * DATA REQUIREMENTS:
 * - Form submission: Server Action → POST /api/submit-enquiry
 *   Payload: { type: EnquiryType, organisationName, organisationRole, name, email, mobile, fleetSize?, message }
 *   TODO: Asif to implement:
 *     1. Server Action that POSTs to /api/submit-enquiry
 *     2. /api/submit-enquiry route: saves to Supabase table enquiry_submissions + triggers email notification
 *     3. Email notification to admin on new submission
 * - URL param ?type= pre-selects the enquiry type
 * - URL param ?programme= pre-fills the programme field in the message
 */


import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ECOSYSTEM_URLS } from "@/lib/constants";

type EnquiryType = "fleet-company" | "individual-learner" | "partnership" | "general";

const ENQUIRY_TYPE_LABELS: Record<EnquiryType, string> = {
  "fleet-company": "Book for my company / fleet",
  "individual-learner": "Individual learner enrolment",
  partnership: "Partnership enquiry",
  general: "General enquiry",
};

function ContactForm() {
  const searchParams = useSearchParams();
  const typeParam = ((searchParams?.get("type") ?? "general")) as EnquiryType;
  const programmeParam = searchParams?.get("programme") ?? "";

  const [enquiryType, setEnquiryType] = useState<EnquiryType>(typeParam);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill message with programme if provided
  const defaultMessage = programmeParam
    ? `I am interested in the ${programmeParam.replace(/-/g, " ")} programme.`
    : "";

  const [formData, setFormData] = useState({
    organisationName: "",
    organisationRole: "",
    name: "",
    email: "",
    mobile: "",
    fleetSize: "",
    message: defaultMessage,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // TODO: Asif to implement — replace this stub with a Server Action or fetch to /api/submit-enquiry
    // Expected payload:
    // {
    //   type: enquiryType,
    //   organisationName: formData.organisationName,
    //   organisationRole: formData.organisationRole,
    //   name: formData.name,
    //   email: formData.email,
    //   mobile: formData.mobile,
    //   fleetSize: formData.fleetSize || null,
    //   message: formData.message,
    // }
    await new Promise((r) => setTimeout(r, 800)); // Remove when real action is wired
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
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
        <h3 style={{ marginBottom: "0.75rem" }}>Enquiry received</h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          Thank you for getting in touch. We will be in contact with you shortly.
        </p>
        <Link href="/" className="btn-secondary">
          Return to GreenFreightAcademy
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Enquiry type */}
      <div style={{ padding: "1.25rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.625rem" }}>
        <label className="form-label">Nature of enquiry</label>
        <select
          name="enquiryType"
          value={enquiryType}
          onChange={(e) => setEnquiryType(e.target.value as EnquiryType)}
          className="form-input"
          required
        >
          {(Object.entries(ENQUIRY_TYPE_LABELS) as [EnquiryType, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Organisation */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", padding: "1.25rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.625rem" }}>
        <div>
          <label className="form-label">Organisation name</label>
          <input
            type="text"
            name="organisationName"
            value={formData.organisationName}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g. Acme Transport"
            required
          />
        </div>
        <div>
          <label className="form-label">Role in organisation</label>
          <input
            type="text"
            name="organisationRole"
            value={formData.organisationRole}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g. Fleet Manager, HR Director"
            required
          />
        </div>
      </div>

      {/* Contact */}
      <div style={{ padding: "1.25rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.625rem" }}>
        <label className="form-label">Your name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="form-input"
          placeholder="First and last name"
          required
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", padding: "1.25rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.625rem" }}>
        <div>
          <label className="form-label">Email address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="form-input"
            placeholder="you@company.co.za"
            required
          />
        </div>
        <div>
          <label className="form-label">Mobile number</label>
          <input
            type="tel"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            className="form-input"
            placeholder="082 000 0000"
            required
          />
        </div>
      </div>

      {/* Fleet size — optional, shown for company enquiries */}
      {(enquiryType === "fleet-company") && (
        <div style={{ padding: "1.25rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.625rem" }}>
          <label className="form-label">
            Fleet size{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            name="fleetSize"
            value={formData.fleetSize}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g. 45 vehicles"
          />
        </div>
      )}

      {/* Message */}
      <div style={{ padding: "1.25rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.625rem" }}>
        <label className="form-label">
          Message{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          className="form-input"
          rows={4}
          placeholder="Tell us what you need or any questions you have…"
          style={{ resize: "vertical" }}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary"
        style={{ alignSelf: "flex-start", opacity: submitting ? 0.7 : 1 }}
      >
        {submitting ? "Sending…" : "Send enquiry"}
        {!submitting && <ArrowRight size={16} />}
      </button>
    </form>
  );
}

export default function ContactPageClient() {
  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      {/* Header */}
      <section
        style={{
          padding: "5rem 0 4rem",
          background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container-gfa">
          <span className="pill-badge pill-green" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
            Get in touch
          </span>
          <h1 style={{ maxWidth: "560px", marginBottom: "1rem" }}>
            Start a conversation
          </h1>
          <p style={{ maxWidth: "520px", fontSize: "1.0625rem", color: "var(--text-secondary)" }}>
            Whether you are booking for your company, enquiring about a specific programme, or exploring a
            partnership, we will be in touch promptly.
          </p>
        </div>
      </section>

      {/* Form + sidebar */}
      <section style={{ padding: "4rem 0" }}>
        <div className="container-gfa">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "4rem",
              alignItems: "flex-start",
            }}
          >
            {/* Form */}
            <div>
              <Suspense fallback={<div style={{ color: "var(--text-muted)" }}>Loading form…</div>}>
                <ContactForm />
              </Suspense>
            </div>

            {/* Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div
                style={{
                  padding: "1.5rem",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "0.875rem",
                }}
              >
                <h4 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>What happens next</h4>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {[
                    "We review your enquiry",
                    "We contact you within one business day",
                    "We confirm programme fit and pricing",
                    "We set up your company account",
                    "Your team starts training",
                  ].map((step, i) => (
                    <li
                      key={step}
                      style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}
                    >
                      <span
                        style={{
                          width: "1.25rem",
                          height: "1.25rem",
                          borderRadius: "50%",
                          background: "rgba(34, 197, 94, 0.12)",
                          border: "1px solid rgba(34, 197, 94, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: "var(--color-green-400)",
                          flexShrink: 0,
                          marginTop: "0.1rem",
                        }}
                      >
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <div
                style={{
                  padding: "1.5rem",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "0.875rem",
                }}
              >
                <h4 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>Transformation Ecosystem</h4>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                  GFA is part of the Transport Action Group ecosystem alongside TAG and BetterDriver.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Link href={ECOSYSTEM_URLS.tag} style={{ fontSize: "0.8rem", color: "var(--color-green-400)", textDecoration: "none" }}>
                    Transport Action Group →
                  </Link>
                  <Link href={ECOSYSTEM_URLS.betterDriver} style={{ fontSize: "0.8rem", color: "var(--color-teal-400)", textDecoration: "none" }}>
                    BetterDriver →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
