"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FileCheck2, Loader2, Search, ShieldCheck, XCircle } from "lucide-react";

interface VerificationResult {
  verified: boolean;
  status: "active" | "expired" | "revoked" | "not_found";
  certificateNumber?: string;
  programme?: string;
  issuedAt?: string;
  expiresAt?: string | null;
}

interface RegistryPageClientProps {
  initialCertificateNumber?: string;
}

function displayDate(value: string | null | undefined) {
  if (!value) return "No expiry recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusCopy(status: VerificationResult["status"]) {
  if (status === "active") return { heading: "Certificate verified", body: "This Green Freight Academy certificate is active as at the time of this check.", colour: "#4ade80", Icon: CheckCircle2 };
  if (status === "expired") return { heading: "Certificate not current", body: "This certificate record is recognised, but its recorded validity period has ended.", colour: "#fbbf24", Icon: AlertCircle };
  if (status === "revoked") return { heading: "Certificate not valid", body: "This certificate record has been revoked and must not be relied upon as current training evidence.", colour: "#f87171", Icon: XCircle };
  return { heading: "No certificate record found", body: "No Green Freight Academy certificate was found for that exact certificate number.", colour: "#94a3b8", Icon: AlertCircle };
}

export default function RegistryPageClient({ initialCertificateNumber = "" }: RegistryPageClientProps) {
  const [certificateNumber, setCertificateNumber] = useState(initialCertificateNumber);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCertificateNumber) setCertificateNumber(initialCertificateNumber.toUpperCase());
  }, [initialCertificateNumber]);

  const verifyCertificate = async (event: FormEvent) => {
    event.preventDefault();
    const value = certificateNumber.trim().toUpperCase();
    if (!value || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/public/certificates/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ certificateNumber: value }),
        cache: "no-store",
      });
      const data = await response.json() as VerificationResult & { error?: string };
      if (response.status === 404) {
        setResult({ verified: false, status: "not_found" });
        return;
      }
      if (!response.ok) throw new Error(data.error || "Certificate verification is unavailable.");
      setResult(data);
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Certificate verification is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const status = result ? statusCopy(result.status) : null;

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      <section style={{ padding: "5rem 0 4rem", background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container-gfa">
          <p style={{ color: "var(--color-green-400)", fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.08em", marginBottom: "0.9rem" }}>GREEN FREIGHT ACADEMY</p>
          <h1 style={{ maxWidth: "680px", marginBottom: "1rem" }}>Certificate verification</h1>
          <p style={{ maxWidth: "620px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Confirm the current status of a Green Freight Academy certificate using its exact certificate number.
          </p>
          <p style={{ maxWidth: "620px", color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.75rem", lineHeight: 1.6 }}>
            To protect learner privacy, verification does not search by name, ID number, mobile number or employer.
          </p>
        </div>
      </section>

      <section style={{ padding: "4rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container-gfa" style={{ maxWidth: "680px" }}>
          <form onSubmit={verifyCertificate}>
            <label htmlFor="certificate-number" style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.625rem" }}>
              Exact certificate number
            </label>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                <input
                  id="certificate-number"
                  type="text"
                  value={certificateNumber}
                  onChange={(event) => setCertificateNumber(event.target.value.toUpperCase())}
                  placeholder="e.g. GFA-2026-00100000"
                  maxLength={17}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  style={{ width: "100%", padding: "0.75rem 0.875rem 0.75rem 2.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", borderRadius: "0.5rem", color: "white", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box" }}
                  onFocus={(event) => (event.currentTarget.style.borderColor = "var(--color-green-400)")}
                  onBlur={(event) => (event.currentTarget.style.borderColor = "var(--border-subtle)")}
                />
              </div>
              <button type="submit" disabled={loading || !certificateNumber.trim()} className="btn-primary" style={{ flexShrink: 0, opacity: loading || !certificateNumber.trim() ? 0.6 : 1 }}>
                {loading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />Checking…</> : <><ShieldCheck size={16} />Verify certificate</>}
              </button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.625rem" }}>
              Enter the number printed on the certificate. Verification results do not provide access to certificate documents.
            </p>
          </form>
        </div>
      </section>

      <section style={{ padding: "3.5rem 0" }}>
        <div className="container-gfa" style={{ maxWidth: "680px" }}>
          {error && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "1.25rem 1.5rem", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "0.75rem", color: "#f87171" }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "0.125rem" }} />
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>{error}</p>
            </div>
          )}

          {result && status && (
            <div style={{ padding: "1.75rem", background: "rgba(255,255,255,0.02)", border: `1px solid ${status.colour}33`, borderRadius: "0.75rem" }}>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: result.certificateNumber ? "1.5rem" : 0 }}>
                <status.Icon size={23} style={{ color: status.colour, flexShrink: 0, marginTop: "0.1rem" }} />
                <div>
                  <h2 style={{ color: "white", fontSize: "1.25rem", marginBottom: "0.35rem" }}>{status.heading}</h2>
                  <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{status.body}</p>
                </div>
              </div>
              {result.certificateNumber && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", borderTop: "1px solid var(--border-subtle)", paddingTop: "1.25rem", gap: "1rem" }}>
                  <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.04em", marginBottom: "0.25rem" }}>CERTIFICATE NUMBER</p><p style={{ color: "white", fontWeight: 600 }}>{result.certificateNumber}</p></div>
                  <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.04em", marginBottom: "0.25rem" }}>PROGRAMME</p><p style={{ color: "white", fontWeight: 600 }}>{result.programme}</p></div>
                  <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.04em", marginBottom: "0.25rem" }}>ISSUED</p><p style={{ color: "white", fontWeight: 600 }}>{displayDate(result.issuedAt)}</p></div>
                  <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.04em", marginBottom: "0.25rem" }}>VALIDITY</p><p style={{ color: "white", fontWeight: 600 }}>{displayDate(result.expiresAt)}</p></div>
                </div>
              )}
            </div>
          )}

          {!result && !error && !loading && (
            <div style={{ padding: "3rem", background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border-subtle)", borderRadius: "0.75rem", textAlign: "center" }}>
              <FileCheck2 size={28} style={{ color: "var(--text-muted)", margin: "0 auto 1rem" }} />
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>Enter an exact Green Freight Academy certificate number to check its current status.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
