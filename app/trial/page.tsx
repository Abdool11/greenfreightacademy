"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, AlertTriangle, Download, ArrowRight } from "lucide-react";

interface VoucherInfo {
  valid: boolean;
  code: string;
  seats: number;
  expiresAt: string;
  welcomeMessage?: string;
  brochureUrl?: string;
  prospectName?: string;
  prospectCompany?: string;
  prospectEmail?: string;
}

function TrialContent() {
  const searchParams = useSearchParams();
  const codeParam = useSearchParams().get("code") ?? "";

  const [step, setStep] = useState<"validate" | "register" | "success">("validate");
  const [voucher, setVoucher] = useState<VoucherInfo | null>(null);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState("");

  // Registration form
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!codeParam) {
      setError("No voucher code provided. Please use the link from your invitation email.");
      setValidating(false);
      return;
    }

    fetch(`/api/trial/validate?code=${encodeURIComponent(codeParam)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) {
          setVoucher(d);
          setCompanyName(d.prospectCompany ?? "");
          setContactName(d.prospectName ?? "");
          setEmail(d.prospectEmail ?? "");
          setStep("register");
        } else {
          setError(d.error ?? "Invalid or expired voucher code.");
        }
      })
      .catch(() => setError("Could not validate voucher. Please try again."))
      .finally(() => setValidating(false));
  }, [codeParam]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/trial/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeParam, companyName, contactName, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }
      setStep("success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #060e1a 0%, #0a1628 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
  };

  const cardStyle: React.CSSProperties = {
    background: "#0a1628",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "1.25rem",
    padding: "2.5rem",
    maxWidth: "480px",
    width: "100%",
    color: "#f9fafb",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem 1rem",
    background: "#060e1a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "0.625rem",
    color: "#f9fafb",
    fontSize: "0.9375rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "#9ca3af",
    marginBottom: "0.375rem",
  };

  if (validating) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <Loader2 size={40} style={{ color: "#22c55e", margin: "0 auto 1rem", display: "block", animation: "spin 1s linear infinite" }} />
            <h2 style={{ margin: "0 0 0.5rem" }}>Validating your invitation…</h2>
            <p style={{ color: "#6b7280", margin: 0, fontSize: "0.9375rem" }}>Please wait a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && step === "validate") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <AlertTriangle size={40} style={{ color: "#f87171", margin: "0 auto 1rem", display: "block" }} />
            <h2 style={{ margin: "0 0 0.75rem" }}>Invalid invitation</h2>
            <p style={{ color: "#9ca3af", margin: "0 0 1.5rem", fontSize: "0.9375rem" }}>{error}</p>
            <a href="/" style={{ color: "#22c55e", textDecoration: "none", fontSize: "0.875rem" }}>← Back to GreenFreightAcademy</a>
          </div>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center" }}>
            <CheckCircle2 size={48} style={{ color: "#22c55e", margin: "0 auto 1rem", display: "block" }} />
            <h2 style={{ margin: "0 0 0.5rem" }}>Trial account activated!</h2>
            <p style={{ color: "#9ca3af", margin: "0 0 0.5rem", fontSize: "0.9375rem" }}>
              Welcome to GreenFreightAcademy. Your trial account is ready with <strong style={{ color: "#22c55e" }}>{voucher?.seats} driver seat{(voucher?.seats ?? 1) > 1 ? "s" : ""}</strong>.
            </p>
            <p style={{ color: "#6b7280", margin: "0 0 1.5rem", fontSize: "0.875rem" }}>
              Trial expires: {voucher?.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString("en-ZA") : ""}
            </p>
            <a
              href="/dashboard"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", background: "#22c55e", borderRadius: "0.625rem", color: "#000", fontWeight: 700, textDecoration: "none", fontSize: "0.9375rem" }}
            >
              Go to your dashboard <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#22c55e", marginBottom: "0.25rem" }}>GreenFreightAcademy</div>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem" }}>Activate your trial</h2>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.375rem 0.875rem", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "1rem", fontSize: "0.8125rem", color: "#22c55e", fontWeight: 600 }}>
            {voucher?.seats} driver seat{(voucher?.seats ?? 1) > 1 ? "s" : ""} included
          </div>
        </div>

        {/* Welcome message */}
        {voucher?.welcomeMessage && (
          <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "0.75rem", padding: "1rem 1.25rem", marginBottom: "1.5rem", fontSize: "0.9rem", color: "#d1fae5", lineHeight: 1.6, fontStyle: "italic" }}>
            {voucher.welcomeMessage}
          </div>
        )}

        {/* Brochure download */}
        {voucher?.brochureUrl && (
          <a
            href={voucher.brochureUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1rem", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "0.625rem", color: "#60a5fa", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600, marginBottom: "1.5rem" }}
          >
            <Download size={14} /> Download training brochure
          </a>
        )}

        {/* Registration form */}
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Company name</label>
            <input style={inputStyle} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="Your fleet company name" />
          </div>
          <div>
            <label style={labelStyle}>Your name</label>
            <input style={inputStyle} value={contactName} onChange={(e) => setContactName(e.target.value)} required placeholder="Full name" />
          </div>
          <div>
            <label style={labelStyle}>Email address</label>
            <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.co.za" />
          </div>
          <div>
            <label style={labelStyle}>Mobile number</label>
            <input style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 xx xxx xxxx" />
          </div>
          <div>
            <label style={labelStyle}>Set a password</label>
            <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Minimum 8 characters" minLength={8} />
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 0.875rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", color: "#f87171", fontSize: "0.875rem" }}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.875rem", background: "#22c55e", border: "none", borderRadius: "0.625rem", color: "#000", fontWeight: 700, fontSize: "1rem", cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Activating…</> : <>Activate trial <ArrowRight size={16} /></>}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#4b5563", marginTop: "1rem", marginBottom: 0 }}>
          By activating, you agree to GreenFreightAcademy's terms of service. Trial expires {voucher?.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString("en-ZA") : ""}.
        </p>
      </div>
    </div>
  );
}

export default function TrialPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#060e1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} style={{ color: "#22c55e", animation: "spin 1s linear infinite" }} />
      </div>
    }>
      <TrialContent />
    </Suspense>
  );
}
