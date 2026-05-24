"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Database,
  Users,
  Building2,
  FileText,
  RefreshCw,
  Shield,
} from "lucide-react";

interface DataCounts {
  companies: number;
  drivers: number;
  quotes: number;
  invitations: number;
  leads: number;
}

interface CompanySample {
  id: string;
  name: string;
  account_type: string;
  created_at: string;
}

interface DriverSample {
  id: string;
  first_name: string;
  last_name: string;
  activation_status: string;
  created_at: string;
}

export default function AdminDataPage() {
  const [counts, setCounts] = useState<DataCounts | null>(null);
  const [companies, setCompanies] = useState<CompanySample[]>([]);
  const [drivers, setDrivers] = useState<DriverSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());

  function loadData() {
    setLoading(true);
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((d) => {
        setCounts(d.counts);
        setCompanies(d.samples?.companies ?? []);
        setDrivers(d.samples?.drivers ?? []);
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load data" }))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  async function deleteSelected(table: string, ids: string[]) {
    setDeleting(table);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_by_ids", table, ids }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: data.error ?? "Delete failed" }); return; }
      setMessage({ type: "success", text: `Deleted ${data.deleted} record(s) successfully.` });
      setSelectedCompanies(new Set());
      setSelectedDrivers(new Set());
      loadData();
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setDeleting(null);
    }
  }

  async function purgeTestData() {
    setPurging(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purge_test_data" }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: data.error ?? "Purge failed" }); return; }
      setMessage({ type: "success", text: `Purged ${data.deletedCompanies} test company/companies and all related data.` });
      setConfirmPurge(false);
      loadData();
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setPurging(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "#0a1628",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "0.875rem",
    padding: "1.25rem 1.5rem",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060e1a", color: "#f9fafb" }}>
      {/* Nav */}
      <div style={{ background: "#0a1628", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href="/admin/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#9ca3af", textDecoration: "none", fontSize: "0.875rem" }}>
          <ArrowLeft size={15} /> Admin Dashboard
        </Link>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>›</span>
        <span style={{ color: "#f9fafb", fontWeight: 600, fontSize: "0.875rem" }}>Data Management</span>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <Database size={20} style={{ color: "#22c55e" }} />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Data Management</h1>
          </div>
          <p style={{ color: "#6b7280", margin: 0, fontSize: "0.9375rem" }}>
            Delete test data, sample records, and manage platform data. All deletions are permanent and cascade to related records.
          </p>
        </div>

        {/* Warning banner */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.875rem 1rem", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.75rem", marginBottom: "1.75rem", fontSize: "0.875rem", color: "#9ca3af", lineHeight: 1.6 }}>
          <Shield size={14} style={{ color: "#f87171", flexShrink: 0, marginTop: "0.125rem" }} />
          <span><strong style={{ color: "#f87171" }}>Deletions are permanent.</strong> Deleting a company will also delete all its drivers, enrolments, invitations, and quotes. There is no undo.</span>
        </div>

        {message && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", background: message.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${message.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: "0.625rem", color: message.type === "success" ? "#22c55e" : "#f87171", fontSize: "0.875rem", marginBottom: "1rem" }}>
            {message.type === "success" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {message.text}
          </div>
        )}

        {/* Stats */}
        {counts && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
            {[
              { label: "Companies", value: counts.companies, icon: Building2 },
              { label: "Drivers", value: counts.drivers, icon: Users },
              { label: "Quotes", value: counts.quotes, icon: FileText },
              { label: "Invitations", value: counts.invitations, icon: RefreshCw },
              { label: "Leads", value: counts.leads, icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} style={{ ...cardStyle, textAlign: "center" }}>
                <Icon size={18} style={{ color: "#22c55e", margin: "0 auto 0.5rem", display: "block" }} />
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f9fafb" }}>{value}</div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Purge test data */}
        <div style={{ ...cardStyle, marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "#f9fafb" }}>Purge test data</h3>
          <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "#6b7280" }}>
            Automatically finds and deletes all companies, drivers, and related data where the company name contains "test", "sample", "demo", "dummy", or "example".
          </p>
          {!confirmPurge ? (
            <button
              onClick={() => setConfirmPurge(true)}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", color: "#f87171", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
            >
              <Trash2 size={14} /> Purge test data
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.875rem", color: "#f87171" }}>Are you sure? This cannot be undone.</span>
              <button
                onClick={purgeTestData}
                disabled={purging}
                style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", background: "#ef4444", border: "none", borderRadius: "0.5rem", color: "#fff", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}
              >
                {purging ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={13} />}
                Yes, purge
              </button>
              <button onClick={() => setConfirmPurge(false)} style={{ padding: "0.5rem 0.875rem", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#9ca3af", fontSize: "0.875rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Companies list */}
        <div style={{ ...cardStyle, marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "#f9fafb" }}>Recent companies</h3>
            {selectedCompanies.size > 0 && (
              <button
                onClick={() => deleteSelected("companies", Array.from(selectedCompanies))}
                disabled={deleting === "companies"}
                style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", color: "#f87171", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer" }}
              >
                {deleting === "companies" ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} />}
                Delete {selectedCompanies.size} selected
              </button>
            )}
          </div>
          {loading ? (
            <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>Loading…</div>
          ) : companies.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>No companies found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {companies.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", background: selectedCompanies.has(c.id) ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${selectedCompanies.has(c.id) ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)"}`, borderRadius: "0.5rem" }}>
                  <input
                    type="checkbox"
                    checked={selectedCompanies.has(c.id)}
                    onChange={() => {
                      const next = new Set(selectedCompanies);
                      next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                      setSelectedCompanies(next);
                    }}
                    style={{ width: "15px", height: "15px", accentColor: "#ef4444", cursor: "pointer" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f9fafb" }}>{c.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{c.account_type} · {new Date(c.created_at).toLocaleDateString("en-ZA")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drivers list */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "#f9fafb" }}>Recent drivers</h3>
            {selectedDrivers.size > 0 && (
              <button
                onClick={() => deleteSelected("drivers", Array.from(selectedDrivers))}
                disabled={deleting === "drivers"}
                style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.75rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", color: "#f87171", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer" }}
              >
                {deleting === "drivers" ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} />}
                Delete {selectedDrivers.size} selected
              </button>
            )}
          </div>
          {loading ? (
            <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>Loading…</div>
          ) : drivers.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>No drivers found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {drivers.map((d) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", background: selectedDrivers.has(d.id) ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${selectedDrivers.has(d.id) ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)"}`, borderRadius: "0.5rem" }}>
                  <input
                    type="checkbox"
                    checked={selectedDrivers.has(d.id)}
                    onChange={() => {
                      const next = new Set(selectedDrivers);
                      next.has(d.id) ? next.delete(d.id) : next.add(d.id);
                      setSelectedDrivers(next);
                    }}
                    style={{ width: "15px", height: "15px", accentColor: "#ef4444", cursor: "pointer" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#f9fafb" }}>{d.first_name} {d.last_name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{d.activation_status} · {new Date(d.created_at).toLocaleDateString("en-ZA")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
