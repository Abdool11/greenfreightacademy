"use client";

/**
 * GreenFreightAcademy — Driver Registry
 *
 * PUBLIC PAGE — no login required.
 *
 * HOW THIS WORKS (for Asif to complete):
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. The user enters a South African ID number (13-digit) OR a full name.
 * 2. On submit, the frontend calls POST /api/registry/lookup with { query }.
 * 3. The API route queries the BetterDriver Moodle instance via the Moodle
 *    External Services REST API:
 *      - Endpoint: https://betterdriver.co.za/webservice/rest/server.php
 *      - Function:  core_user_get_users (search by idnumber or fullname)
 *      - Then:      core_completion_get_activities_completion_status (per user)
 *      - Then:      mod_certificate_get_issued_certificates OR
 *                   core_course_get_user_administration_options for cert URL
 *    Moodle token should be stored in env var: MOODLE_API_TOKEN
 * 4. A successful response returns an array of:
 *      { programmeName, completedAt, certificateUrl }
 * 5. The UI renders the list with View / Download buttons per certificate.
 *
 * STUB BEHAVIOUR (until Asif connects Moodle):
 * - Returns mock data when query matches "demo" (case-insensitive).
 * - Returns empty results for all other queries.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { Search, FileText, Download, AlertCircle, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CertificateResult {
  programmeName: string;
  completedAt: string;
  certificateUrl: string | null;
}

interface LookupResult {
  driverName: string;
  idNumber: string;
  certificates: CertificateResult[];
}

// ─── Mock data (remove once Moodle is connected) ─────────────────────────────
const MOCK_RESULT: LookupResult = {
  driverName: "Demo Driver",
  idNumber: "0000000000000",
  certificates: [
    {
      programmeName: "Professional Truck Driver Programme (PTDP)",
      completedAt: "2025-03-14T10:00:00Z",
      certificateUrl: "#",
    },
    {
      programmeName: "Advanced Eco-Driving",
      completedAt: "2025-06-01T09:30:00Z",
      certificateUrl: "#",
    },
  ],
};

export default function RegistryPageClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setNotFound(false);
    setError(null);
    try {
      /**
       * TODO (Asif): Replace stub below with real fetch:
       *
       * const res = await fetch("/api/registry/lookup", {
       *   method: "POST",
       *   headers: { "Content-Type": "application/json" },
       *   body: JSON.stringify({ query: query.trim() }),
       * });
       * if (res.status === 404) { setNotFound(true); return; }
       * if (!res.ok) throw new Error("lookup_failed");
       * const data: LookupResult = await res.json();
       * setResult(data);
       *
       * See developer notes at bottom of file for Moodle API details.
       */
      await new Promise((r) => setTimeout(r, 900));
      if (query.trim().toLowerCase() === "demo") {
        setResult(MOCK_RESULT);
      } else {
        setNotFound(true);
      }
    } catch {
      setError("An error occurred while searching. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>

      {/* Hero */}
      <section
        style={{
          padding: "5rem 0 4rem",
          background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="container-gfa">
          <h1 style={{ maxWidth: "600px", marginBottom: "1rem" }}>Registry of Professional Drivers</h1>
          <p style={{ maxWidth: "520px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Verify a driver&apos;s GreenFreightAcademy certifications. Enter a driver ID number or full
            name to search the registry of trained and certified drivers.
          </p>
          <p style={{ maxWidth: "520px", color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.75rem", lineHeight: 1.6 }}>
            This registry is publicly accessible to fleet operators, employers, and compliance auditors.
          </p>
        </div>
      </section>

      {/* Search */}
      <section style={{ padding: "4rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container-gfa" style={{ maxWidth: "680px" }}>
          <form onSubmit={handleSearch}>
            <label
              htmlFor="registry-search"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "0.625rem",
              }}
            >
              Driver ID number or full name
            </label>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "0.875rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="registry-search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. 8001015009087 or John Smith"
                  maxLength={100}
                  style={{
                    width: "100%",
                    padding: "0.75rem 0.875rem 0.75rem 2.5rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "0.5rem",
                    color: "white",
                    fontSize: "0.9375rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-green-400)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="btn-primary"
                style={{ flexShrink: 0, opacity: loading || !query.trim() ? 0.6 : 1 }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Searching…
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    Search
                  </>
                )}
              </button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.625rem" }}>
              Enter a driver ID number for an exact match, or a full name to search by name.
            </p>
          </form>
        </div>
      </section>

      {/* Results */}
      <section style={{ padding: "3.5rem 0" }}>
        <div className="container-gfa" style={{ maxWidth: "680px" }}>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "1.25rem 1.5rem",
                background: "rgba(248,113,113,0.06)",
                border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: "0.75rem",
                color: "#f87171",
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "0.125rem" }} />
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>{error}</p>
            </div>
          )}

          {notFound && (
            <div
              style={{
                padding: "2.5rem",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "0.75rem",
                textAlign: "center",
              }}
            >
              <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: 600 }}>
                No record found
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                No certified driver was found matching{" "}
                <strong style={{ color: "white" }}>&ldquo;{query}&rdquo;</strong>.
                Please check the ID number or name and try again.
              </p>
            </div>
          )}

          {result && (
            <div>
              <div
                style={{
                  padding: "1.5rem",
                  background: "rgba(34,197,94,0.05)",
                  border: "1px solid rgba(34,197,94,0.15)",
                  borderRadius: "0.75rem",
                  marginBottom: "1.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <p style={{ fontWeight: 700, fontSize: "1.0625rem", color: "white", marginBottom: "0.25rem" }}>
                    {result.driverName}
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>ID: {result.idNumber}</p>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.3rem 0.875rem",
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    borderRadius: "9999px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--color-green-400)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Verified
                </span>
              </div>

              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "white", marginBottom: "1rem" }}>
                Completed programmes ({result.certificates.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {result.certificates.map((cert, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "1.25rem 1.5rem",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "0.625rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 600, color: "white", marginBottom: "0.25rem", fontSize: "0.9375rem" }}>
                        {cert.programmeName}
                      </p>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Completed{" "}
                        {new Date(cert.completedAt).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    {cert.certificateUrl ? (
                      <div style={{ display: "flex", gap: "0.625rem", flexShrink: 0 }}>
                        <a
                          href={cert.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary"
                          style={{ fontSize: "0.8rem", padding: "0.45rem 0.875rem", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
                        >
                          <FileText size={14} />
                          View
                        </a>
                        <a
                          href={cert.certificateUrl}
                          download
                          className="btn-ghost"
                          style={{ fontSize: "0.8rem", padding: "0.45rem 0.875rem", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
                        >
                          <Download size={14} />
                          Download
                        </a>
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                        Certificate pending
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!result && !notFound && !error && !loading && (
            <div
              style={{
                padding: "3rem",
                background: "rgba(255,255,255,0.02)",
                border: "1px dashed var(--border-subtle)",
                borderRadius: "0.75rem",
                textAlign: "center",
              }}
            >
              <Search size={28} style={{ color: "var(--text-muted)", margin: "0 auto 1rem" }} />
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                Enter a South African ID number or driver name above to search the registry.
              </p>
            </div>
          )}

        </div>
      </section>

      {/*
        ╔══════════════════════════════════════════════════════════════════════╗
        ║  ASIF — MOODLE INTEGRATION NOTES                                    ║
        ╠══════════════════════════════════════════════════════════════════════╣
        ║  1. Create /app/api/registry/lookup/route.ts                        ║
        ║  2. Accept POST { query: string }                                   ║
        ║  3. Call Moodle REST API:                                           ║
        ║     Base URL: https://betterdriver.co.za/webservice/rest/server.php ║
        ║     Token env var: MOODLE_API_TOKEN                                 ║
        ║                                                                     ║
        ║  Step A — Find user:                                                ║
        ║     wsfunction=core_user_get_users                                  ║
        ║     criteria[0][key]=idnumber  (for SA ID search)                  ║
        ║     criteria[0][value]={query}                                      ║
        ║     OR criteria[0][key]=fullname  (for name search)                ║
        ║                                                                     ║
        ║  Step B — Get completions:                                          ║
        ║     wsfunction=core_completion_get_activities_completion_status     ║
        ║     userid={userId from Step A}                                     ║
        ║     courseid={each enrolled course}                                 ║
        ║                                                                     ║
        ║  Step C — Get certificate URL:                                      ║
        ║     wsfunction=mod_certificate_get_issued_certificates              ║
        ║     OR /mod/certificate/view.php?id={cmid}&action=get              ║
        ║                                                                     ║
        ║  4. Return JSON: { driverName, idNumber, certificates[] }          ║
        ║  5. Remove MOCK_RESULT and stub setTimeout above                    ║
        ╚══════════════════════════════════════════════════════════════════════╝
      */}

    </div>
  );
}
