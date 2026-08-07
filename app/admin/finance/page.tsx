"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, Clock, CheckCircle2, AlertTriangle, Loader2,
  RefreshCw, Download, ChevronRight, CreditCard, Landmark,
  Building2, FileText,
} from "lucide-react";

type Tab = "overview" | "transactions" | "pending" | "client";

interface OverviewData {
  totalRevenue: number;
  monthlyRevenue: number;
  paystackRevenue: number;
  eftRevenue: number;
  eftPendingCount: number;
  quotePendingCount: number;
  totalCompanies: number;
  eftPending: EftQuote[];
  quotePending: PendingQuote[];
}

interface EftQuote {
  id: string;
  reference: string;
  total: number;
  eft_submitted_at: string;
  eft_reference?: string;
  companies: { id: string; name: string; contact_email: string } | null;
}

interface PendingQuote {
  id: string;
  reference: string;
  total: number;
  created_at: string;
  companies: { id: string; name: string; contact_email: string } | null;
}

interface LedgerEntry {
  id: string;
  entry_type: string;
  amount: number;
  description: string;
  reference?: string;
  status: string;
  created_at: string;
  companies?: { name: string } | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n);

const ageLabel = (dateStr: string) => {
  const hrs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (hrs < 1)  return { label: "<1h ago",  color: "#22c55e" };
  if (hrs < 24) return { label: `${hrs}h ago`, color: "#22c55e" };
  if (hrs < 48) return { label: `${Math.floor(hrs/24)}d ago`, color: "#f59e0b" };
  return { label: `${Math.floor(hrs/24)}d ago — OVERDUE`, color: "#ef4444" };
};

const entryTypeColor: Record<string, string> = {
  quote_issued:         "#6b7280",
  payment_received:     "#22c55e",
  eft_submitted:        "#f59e0b",
  eft_confirmed:        "#22c55e",
  credits_allocated:    "#3b82f6",
  credits_used:         "#a78bfa",
  trial_credits:        "#3b82f6",
  bulletin_payment:     "#f59e0b",
};

export default function AdminFinancePage() {
  const [tab, setTab]         = useState<Tab>("overview");
  const [data, setData]       = useState<OverviewData | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [approved, setApproved]   = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [clientData, setClientData] = useState<{ company: Record<string, unknown>; entries: LedgerEntry[]; quotes: Record<string, unknown>[]; driverCount: number } | null>(null);

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      if (t === "overview" || t === "pending") {
        const res = await fetch(`/api/admin/finance?tab=${t}`);
        const d = await res.json();
        setData(d);
      } else if (t === "transactions") {
        const res = await fetch("/api/admin/finance?tab=transactions");
        const d = await res.json();
        setEntries(d.entries ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  const loadClient = async (companyId: string) => {
    setSelectedCompany(companyId);
    setTab("client");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/finance?tab=client&company_id=${companyId}`);
      const d = await res.json();
      setClientData(d);
    } finally { setLoading(false); }
  };

  const approveEft = async (quoteId: string) => {
    setApproving(quoteId);
    try {
      const res = await fetch("/api/admin/quotes/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      if (res.ok) {
        setApproved(quoteId);
        setTimeout(() => { setApproved(null); load("overview"); }, 2000);
      }
    } finally { setApproving(null); }
  };

  const exportCsv = () => {
    const rows = entries.map(e => [
      new Date(e.created_at).toLocaleDateString("en-ZA"),
      (e.companies as { name?: string } | null)?.name ?? "",
      e.entry_type,
      e.description,
      e.reference ?? "",
      e.amount.toFixed(2),
      e.status,
    ]);
    const csv = ["Date,Company,Type,Description,Reference,Amount,Status", ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `GFA-Ledger-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const s = {
    page:  { paddingTop: "5rem", background: "#0a1628", minHeight: "100vh", color: "#f9fafb" } as React.CSSProperties,
    nav:   { background: "#111f3a", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.5rem" } as React.CSSProperties,
    inner: { maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem 4rem" } as React.CSSProperties,
    card:  { background: "#0d1526", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.875rem", padding: "1.25rem", marginBottom: "1.25rem" } as React.CSSProperties,
    stat:  (accent: string) => ({ background: "#0d1526", border: `1px solid ${accent}25`, borderLeft: `3px solid ${accent}`, borderRadius: "0.75rem", padding: "1.125rem" }) as React.CSSProperties,
    th:    { padding: "0.625rem 0.875rem", color: "#6b7280", fontSize: "0.75rem", fontWeight: 700, textAlign: "left" as const, whiteSpace: "nowrap" as const, borderBottom: "1px solid rgba(255,255,255,0.06)" },
    td:    { padding: "0.75rem 0.875rem", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.875rem", verticalAlign: "middle" as const },
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview",     label: "Overview" },
    { id: "transactions", label: "All Transactions" },
    { id: "pending",      label: data?.eftPendingCount ? `Pending (${data.eftPendingCount})` : "Pending" },
    { id: "client",       label: "Per Client" },
  ];

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link href="/admin/dashboard" style={{ color: "#6b7280", fontSize: "0.875rem", textDecoration: "none" }}>← Dashboard</Link>
            <span style={{ color: "#374151" }}>/</span>
            <span style={{ color: "#f9fafb", fontSize: "0.875rem", fontWeight: 600 }}>Finance & Ledger</span>
          </div>
          <button onClick={() => load(tab)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", padding: "0.375rem 0.75rem", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem" }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </nav>

      <div style={s.inner}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.75rem", background: "#0d1526", borderRadius: "0.75rem", padding: "0.25rem", width: "fit-content" }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
                background: tab === t.id ? "#22c55e" : "transparent",
                color: tab === t.id ? "#000" : "#9ca3af",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280" }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: "0 auto 1rem", display: "block" }} />
            Loading…
          </div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === "overview" && data && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                  {[
                    { label: "Total Revenue",    value: fmt(data.totalRevenue),   accent: "#22c55e", Icon: TrendingUp },
                    { label: "This Month",        value: fmt(data.monthlyRevenue), accent: "#3b82f6", Icon: TrendingUp },
                    { label: "Card (Paystack)",   value: fmt(data.paystackRevenue), accent: "#a78bfa", Icon: CreditCard },
                    { label: "EFT Revenue",       value: fmt(data.eftRevenue),     accent: "#f59e0b", Icon: Landmark },
                    { label: "EFT Awaiting",      value: String(data.eftPendingCount),   accent: data.eftPendingCount > 0 ? "#ef4444" : "#22c55e", Icon: Clock },
                    { label: "Quotes Unpaid",     value: String(data.quotePendingCount), accent: data.quotePendingCount > 0 ? "#f59e0b" : "#22c55e", Icon: FileText },
                  ].map(m => (
                    <div key={m.label} style={s.stat(m.accent)}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <m.Icon size={14} style={{ color: m.accent }} />
                        <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>{m.label}</span>
                      </div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: m.accent }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* EFT pending — action required */}
                {data.eftPending.length > 0 && (
                  <div style={s.card}>
                    <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", color: "#ef4444", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <AlertTriangle size={16} /> EFT Payments Awaiting Verification
                    </h3>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>{["Company", "Quote Ref", "Amount", "EFT Ref", "Submitted", "Action"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {data.eftPending.map(q => {
                          const age = ageLabel(q.eft_submitted_at);
                          return (
                            <tr key={q.id}>
                              <td style={s.td}>
                                <button onClick={() => loadClient((q.companies as { id: string } | null)?.id ?? "")} style={{ background: "none", border: "none", color: "#f9fafb", cursor: "pointer", fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                  {(q.companies as { name?: string } | null)?.name ?? "—"} <ChevronRight size={12} style={{ color: "#6b7280" }} />
                                </button>
                              </td>
                              <td style={{ ...s.td, color: "#9ca3af", fontFamily: "monospace" }}>{q.reference}</td>
                              <td style={{ ...s.td, fontWeight: 700, color: "#22c55e" }}>{fmt(q.total)}</td>
                              <td style={{ ...s.td, color: "#9ca3af", fontFamily: "monospace" }}>{q.eft_reference ?? "—"}</td>
                              <td style={{ ...s.td, color: age.color, fontWeight: 600 }}>{age.label}</td>
                              <td style={s.td}>
                                {approved === q.id ? (
                                  <span style={{ color: "#22c55e", fontSize: "0.8125rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}><CheckCircle2 size={14} /> Approved</span>
                                ) : (
                                  <button
                                    onClick={() => approveEft(q.id)}
                                    disabled={approving === q.id}
                                    style={{ background: "#22c55e", border: "none", borderRadius: "0.375rem", padding: "0.375rem 0.875rem", color: "#000", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
                                  >
                                    {approving === q.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                    Confirm EFT
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ── ALL TRANSACTIONS ── */}
            {tab === "transactions" && (
              <div style={s.card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>Ledger — All Companies ({entries.length} entries)</h3>
                  <button onClick={exportCsv} style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", padding: "0.375rem 0.875rem", color: "#9ca3af", fontSize: "0.8125rem", cursor: "pointer" }}>
                    <Download size={13} /> Export CSV
                  </button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>{["Date", "Company", "Type", "Description", "Reference", "Amount", "Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {entries.map(e => {
                        const color = entryTypeColor[e.entry_type] ?? "#6b7280";
                        return (
                          <tr key={e.id}>
                            <td style={{ ...s.td, color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(e.created_at).toLocaleDateString("en-ZA")}</td>
                            <td style={{ ...s.td, fontWeight: 600 }}>{(e.companies as { name?: string } | null)?.name ?? "—"}</td>
                            <td style={s.td}><span style={{ background: color + "18", color, borderRadius: "0.25rem", padding: "0.125rem 0.375rem", fontSize: "0.75rem", fontWeight: 700 }}>{e.entry_type}</span></td>
                            <td style={{ ...s.td, color: "#d1d5db" }}>{e.description}</td>
                            <td style={{ ...s.td, color: "#9ca3af", fontFamily: "monospace", fontSize: "0.8125rem" }}>{e.reference ?? "—"}</td>
                            <td style={{ ...s.td, fontWeight: 700, color: e.amount >= 0 ? "#22c55e" : "#ef4444", whiteSpace: "nowrap" }}>
                              {e.amount >= 0 ? "+" : ""}{fmt(e.amount)}
                            </td>
                            <td style={s.td}>
                              <span style={{ background: e.status === "confirmed" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)", color: e.status === "confirmed" ? "#22c55e" : "#f59e0b", borderRadius: "9999px", padding: "0.125rem 0.5rem", fontSize: "0.6875rem", fontWeight: 700 }}>
                                {e.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── PENDING ── */}
            {tab === "pending" && data && (
              <>
                {data.eftPending.length === 0 && data.quotePendingCount === 0 ? (
                  <div style={{ ...s.card, textAlign: "center", padding: "3rem", color: "#22c55e" }}>
                    <CheckCircle2 size={32} style={{ margin: "0 auto 0.75rem", display: "block" }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>No pending items — all clear!</p>
                  </div>
                ) : (
                  <>
                    {data.eftPending.length > 0 && (
                      <div style={s.card}>
                        <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", color: "#ef4444", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <AlertTriangle size={16} /> EFT Payments Awaiting Verification ({data.eftPending.length})
                        </h3>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr>{["Company", "Quote Ref", "Amount", "EFT Ref", "Waiting", "Action"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {data.eftPending.map(q => {
                              const age = ageLabel(q.eft_submitted_at);
                              return (
                                <tr key={q.id}>
                                  <td style={{ ...s.td, fontWeight: 600 }}>{(q.companies as { name?: string } | null)?.name ?? "—"}</td>
                                  <td style={{ ...s.td, color: "#9ca3af", fontFamily: "monospace" }}>{q.reference}</td>
                                  <td style={{ ...s.td, fontWeight: 700, color: "#22c55e" }}>{fmt(q.total)}</td>
                                  <td style={{ ...s.td, color: "#9ca3af", fontFamily: "monospace" }}>{q.eft_reference ?? "—"}</td>
                                  <td style={{ ...s.td, color: age.color, fontWeight: 600 }}>{age.label}</td>
                                  <td style={s.td}>
                                    {approved === q.id ? (
                                      <span style={{ color: "#22c55e", fontSize: "0.8125rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}><CheckCircle2 size={14} /> Approved</span>
                                    ) : (
                                      <button onClick={() => approveEft(q.id)} disabled={approving === q.id} style={{ background: "#22c55e", border: "none", borderRadius: "0.375rem", padding: "0.375rem 0.875rem", color: "#000", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                        {approving === q.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                                        Confirm EFT
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── PER CLIENT ── */}
            {tab === "client" && (
              <>
                {!selectedCompany || !clientData ? (
                  <div style={s.card}>
                    <p style={{ color: "#6b7280", margin: 0 }}>Select a company from the EFT pending list or the <Link href="/admin/companies" style={{ color: "#22c55e" }}>Companies page</Link> to view their account.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                      <Building2 size={18} style={{ color: "#22c55e" }} />
                      <h2 style={{ margin: 0, fontSize: "1.125rem" }}>{String(clientData.company?.name ?? "")}</h2>
                      <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>{String(clientData.company?.contact_email ?? "")}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.875rem", marginBottom: "1.25rem" }}>
                      {[
                        { label: "Credit Balance", value: fmt(Number(clientData.company?.credit_balance ?? 0)), accent: "#22c55e" },
                        { label: "Total Quotes",   value: String(clientData.quotes.length), accent: "#3b82f6" },
                        { label: "Drivers",        value: String(clientData.driverCount), accent: "#a78bfa" },
                        { label: "Discount",       value: clientData.company?.discount_percent ? `${clientData.company.discount_percent}%` : "None", accent: "#f59e0b" },
                      ].map(m => (
                        <div key={m.label} style={s.stat(m.accent)}>
                          <div style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "0.375rem" }}>{m.label}</div>
                          <div style={{ fontSize: "1.375rem", fontWeight: 700, color: m.accent }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={s.card}>
                      <h3 style={{ margin: "0 0 1rem", fontSize: "0.9375rem" }}>Transaction History</h3>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>{["Date", "Type", "Description", "Reference", "Amount", "Status"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {clientData.entries.map((e: LedgerEntry) => {
                            const color = entryTypeColor[e.entry_type] ?? "#6b7280";
                            return (
                              <tr key={e.id}>
                                <td style={{ ...s.td, color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(e.created_at).toLocaleDateString("en-ZA")}</td>
                                <td style={s.td}><span style={{ background: color + "18", color, borderRadius: "0.25rem", padding: "0.125rem 0.375rem", fontSize: "0.75rem", fontWeight: 700 }}>{e.entry_type}</span></td>
                                <td style={{ ...s.td, color: "#d1d5db" }}>{e.description}</td>
                                <td style={{ ...s.td, color: "#9ca3af", fontFamily: "monospace", fontSize: "0.8125rem" }}>{e.reference ?? "—"}</td>
                                <td style={{ ...s.td, fontWeight: 700, color: e.amount >= 0 ? "#22c55e" : "#ef4444" }}>{e.amount >= 0 ? "+" : ""}{fmt(e.amount)}</td>
                                <td style={s.td}><span style={{ background: e.status === "confirmed" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)", color: e.status === "confirmed" ? "#22c55e" : "#f59e0b", borderRadius: "9999px", padding: "0.125rem 0.5rem", fontSize: "0.6875rem", fontWeight: 700 }}>{e.status}</span></td>
                              </tr>
                            );
                          })}
                          {clientData.entries.length === 0 && (
                            <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "#4b5563", padding: "2rem" }}>No transactions recorded yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
