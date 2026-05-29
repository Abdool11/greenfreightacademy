"use client";

/**
 * GreenFreightAcademy — Driver Registry
 *
 * PUBLIC PAGE — no login required.
 *
 * SOURCE OF TRUTH: BetterDriver Supabase `certifications` table (via BD API).
 * Certificates are auto-inserted by the Moodle webhook on programme completion.
 * This page queries GET /api/registry?q=<search> on the BD domain.
 *
 * The BD_API_BASE_URL env var must be set to the BetterDriver domain:
 *   BD_API_BASE_URL=https://betterdriver.co.za
 *
 * For local development, set BD_API_BASE_URL=http://localhost:3001
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, CheckCircle2, XCircle, AlertCircle, Loader2, Award, ExternalLink } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RegistryEntry {
  id: string;
  driverName: string;
  idNumber: string;
  certificateNumber: string;
  programme: string;
  issuedAt: string;
  status: string;
  verificationUrl: string;
}

interface RegistryResponse {
  results: RegistryEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const DEBOUNCE_MS = 400;
const BD_REGISTRY_URL = process.env.NEXT_PUBLIC_BD_API_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BD_API_BASE_URL}/api/registry`
  : "/api/registry-proxy"; // falls back to a local proxy route (see below)

// ─── Component ────────────────────────────────────────────────────────────────
export default function RegistryPageClient() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<RegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRegistry = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`${BD_REGISTRY_URL}?${params.toString()}`);
      if (!res.ok) throw new Error("Registry lookup failed");
      const json: RegistryResponse = await res.json();
      setData(json);
    } catch {
      setError("Could not load the registry. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchRegistry("", 1); }, [fetchRegistry]);

  // Debounced search
  const handleSearch = (value: string) => {
    setQuery(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchRegistry(value, 1), DEBOUNCE_MS);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchRegistry(query, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>

      {/* Hero */}
      <section style={{ padding: "5rem 0 4rem", background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container-gfa">
          <h1 style={{ maxWidth: "600px", marginBottom: "1rem" }}>Registry of Professional Drivers</h1>
          <p style={{ maxWidth: "520px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Verify a driver&apos;s BetterDriver certifications. Search by driver name, ID number, or certificate number.
          </p>
          <p style={{ maxWidth: "520px", color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.75rem", lineHeight: 1.6 }}>
            This registry is publicly accessible to fleet operators, employers, and compliance auditors.
            Certificates are issued automatically upon programme completion.
          </p>
        </div>
      </section>

      {/* Search */}
      <section style={{ padding: "3rem 0 2rem", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container-gfa" style={{ maxWidth: "680px" }}>
          <label
            htmlFor="registry-search"
            style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.625rem" }}
          >
            Search the registry
          </label>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            {loading && query && (
              <Loader2 size={15} style={{ position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
            )}
            <input
              id="registry-search"
              type="search"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Driver name, ID number, or certificate number…"
              maxLength={100}
              style={{
                width: "100%",
                padding: "0.8125rem 2.5rem 0.8125rem 2.5rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "0.625rem",
                color: "white",
                fontSize: "0.9375rem",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--color-green-400)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            />
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            Results update as you type. ID numbers are partially masked for privacy.
          </p>
        </div>
      </section>

      {/* Results */}
      <section style={{ padding: "2.5rem 0 5rem" }}>
        <div className="container-gfa" style={{ maxWidth: "680px" }}>

          {/* Stats */}
          {!loading && !error && data && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              {query.trim()
                ? `${data.total} result${data.total !== 1 ? "s" : ""} for "${query.trim()}"`
                : `${data.total.toLocaleString()} certified driver${data.total !== 1 ? "s" : ""} in the registry`}
            </p>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", padding: "1.25rem", height: 68, opacity: 0.4 + i * 0.1 }} />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "1.25rem 1.5rem", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "0.75rem", color: "#f87171" }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "0.125rem" }} />
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && data && data.results.length === 0 && (
            <div style={{ padding: "3rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", textAlign: "center" }}>
              <Award size={40} style={{ color: "var(--text-muted)", margin: "0 auto 1rem" }} />
              <p style={{ color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.5rem" }}>
                {query.trim() ? "No records found" : "No certificates issued yet"}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                {query.trim()
                  ? `No certified driver was found matching "${query.trim()}". Check the spelling or try a certificate number.`
                  : "Certificates will appear here automatically once drivers complete their programmes."}
              </p>
            </div>
          )}

          {/* Results list */}
          {!loading && !error && data && data.results.length > 0 && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
                {data.results.map(entry => (
                  <div
                    key={entry.id}
                    style={{
                      padding: "1.25rem 1.5rem",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "0.75rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "1rem",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(34,197,94,0.3)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-subtle)")}
                  >
                    {/* Driver info */}
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "1rem", color: "white", margin: "0 0 0.25rem" }}>
                        {entry.driverName}
                      </p>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
                        {entry.programme}
                      </p>
                    </div>

                    {/* Cert details */}
                    <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: "0 0 0.125rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Certificate</p>
                        <p style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0 }}>{entry.certificateNumber}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: "0 0 0.125rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Issued</p>
                        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0 }}>{formatDate(entry.issuedAt)}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {entry.status === "active" ? (
                          <CheckCircle2 size={16} style={{ color: "var(--color-green-400)" }} />
                        ) : (
                          <XCircle size={16} style={{ color: "#f87171" }} />
                        )}
                        <span style={{
                          fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                          color: entry.status === "active" ? "var(--color-green-400)" : "#f87171",
                        }}>
                          {entry.status === "active" ? "Verified" : "Revoked"}
                        </span>
                        <a
                          href={entry.verificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", marginLeft: "0.25rem" }}
                          title="View certificate verification page"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    style={{
                      padding: "0.5rem 1.125rem", borderRadius: "0.5rem",
                      background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)",
                      color: page === 1 ? "var(--text-muted)" : "var(--text-secondary)",
                      cursor: page === 1 ? "not-allowed" : "pointer", fontSize: "0.875rem",
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    {page} / {data.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === data.totalPages}
                    style={{
                      padding: "0.5rem 1.125rem", borderRadius: "0.5rem",
                      background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)",
                      color: page === data.totalPages ? "var(--text-muted)" : "var(--text-secondary)",
                      cursor: page === data.totalPages ? "not-allowed" : "pointer", fontSize: "0.875rem",
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
