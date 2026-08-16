"use client";
export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Building2, CheckCircle2, CreditCard, Download, Landmark, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import EftReconciliationPanel, { EftReconciliationPayment } from "@/components/admin/EftReconciliationPanel";

type Tab = "overview" | "transactions" | "pending" | "client";
interface PendingQuote { id: string; reference: string; total: number; created_at: string; companies?: { id: string; name: string } | null; }
interface FinanceData { totalRevenue?: number; monthlyRevenue?: number; paystackRevenue?: number; eftRevenue?: number; eftPendingCount?: number; quotePendingCount?: number; totalCompanies?: number; eftPending: EftReconciliationPayment[]; quotePending: PendingQuote[]; }
interface LedgerEntry { id: string; entry_type: string; amount: number; description: string; reference?: string; status: string; created_at: string; companies?: { name?: string } | null; }

const fmt = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(value || 0);
const entryColor: Record<string, string> = { quote_issued: "#94a3b8", payment_received: "#22c55e", eft_submitted: "#f59e0b", eft_confirmed: "#22c55e", credits_allocated: "#60a5fa", credits_used: "#a78bfa" };

export default function AdminFinancePage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<FinanceData | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [clientData, setClientData] = useState<{ company: Record<string, unknown>; entries: LedgerEntry[]; quotes: Record<string, unknown>[]; driverCount: number } | null>(null);

  const load = useCallback(async (requestedTab: Tab) => {
    setLoading(true);
    try {
      if (requestedTab === "overview") {
        const response = await fetch("/api/admin/finance?tab=overview");
        setData(await response.json());
      } else if (requestedTab === "pending") {
        const response = await fetch("/api/admin/finance?tab=pending");
        const result = await response.json();
        setData({ eftPending: result.eftPayments ?? [], quotePending: result.staleQuotes ?? [], eftPendingCount: (result.eftPayments ?? []).length, quotePendingCount: (result.staleQuotes ?? []).length });
      } else if (requestedTab === "transactions") {
        const response = await fetch("/api/admin/finance?tab=transactions");
        const result = await response.json();
        setEntries(result.entries ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tab !== "client") load(tab); }, [tab, load]);

  const loadClient = async (companyId: string) => {
    if (!companyId) return;
    setSelectedCompany(companyId); setTab("client"); setLoading(true);
    try {
      const response = await fetch(`/api/admin/finance?tab=client&company_id=${companyId}`);
      setClientData(await response.json());
    } finally { setLoading(false); }
  };

  const exportCsv = () => {
    const rows = entries.map((entry) => [new Date(entry.created_at).toLocaleDateString("en-ZA"), entry.companies?.name ?? "", entry.entry_type, entry.description, entry.reference ?? "", entry.amount.toFixed(2), entry.status]);
    const content = ["Date,Company,Type,Description,Reference,Amount,Status", ...rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `GFA-Ledger-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const card: React.CSSProperties = { background: "#0d1526", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.875rem", padding: "1.25rem", marginBottom: "1.25rem" };
  const th: React.CSSProperties = { padding: "0.65rem 0.8rem", color: "#94a3b8", fontSize: "0.72rem", fontWeight: 700, textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "0.75rem 0.8rem", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.84rem" };
  const pendingCount = data?.eftPendingCount ?? data?.eftPending.length ?? 0;
  const tabs: { id: Tab; label: string }[] = [{ id: "overview", label: "Overview" }, { id: "transactions", label: "All Transactions" }, { id: "pending", label: pendingCount ? `Reconciliation (${pendingCount})` : "Reconciliation" }, { id: "client", label: "Per Client" }];

  return <div style={{ minHeight: "100vh", background: "#0a1628", color: "#f8fafc", paddingTop: "5rem" }}>
    <nav style={{ background: "#111f3a", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.5rem" }}><div style={{ maxWidth: "1180px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><Link href="/admin/dashboard" style={{ color: "#94a3b8", fontSize: "0.85rem", textDecoration: "none" }}>← Dashboard</Link><span style={{ margin: "0 0.6rem", color: "#475569" }}>/</span><strong style={{ fontSize: "0.9rem" }}>Finance & Ledger</strong></div><button onClick={() => tab !== "client" && load(tab)} style={{ background: "transparent", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "0.5rem", padding: "0.45rem 0.75rem", cursor: "pointer", display: "inline-flex", gap: "0.35rem", alignItems: "center" }}><RefreshCw size={14} /> Refresh</button></div></nav>
    <main style={{ maxWidth: "1180px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginBottom: "1.5rem", padding: "0.25rem", background: "#0d1526", borderRadius: "0.75rem", width: "fit-content" }}>{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} style={{ padding: "0.55rem 0.9rem", borderRadius: "0.5rem", border: "none", cursor: "pointer", background: tab === item.id ? "#22c55e" : "transparent", color: tab === item.id ? "#07130a" : "#cbd5e1", fontWeight: 800 }}>{item.label}</button>)}</div>
      {loading ? <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}><Loader2 className="animate-spin" size={28} style={{ margin: "0 auto 0.75rem" }} />Loading finance data…</div> : <>
        {tab === "overview" && data && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: "0.9rem", marginBottom: "1.25rem" }}>{[
            ["Confirmed revenue", fmt(data.totalRevenue ?? 0), "#22c55e", TrendingUp], ["This month", fmt(data.monthlyRevenue ?? 0), "#60a5fa", TrendingUp], ["Card payments", fmt(data.paystackRevenue ?? 0), "#a78bfa", CreditCard], ["Confirmed EFT", fmt(data.eftRevenue ?? 0), "#f59e0b", Landmark], ["Needs reconciliation", String(pendingCount), pendingCount ? "#ef4444" : "#22c55e", AlertTriangle], ["Unpaid quotes", String(data.quotePendingCount ?? 0), "#f59e0b", AlertTriangle],
          ].map(([label, value, color, Icon]) => { const MetricIcon = Icon as typeof TrendingUp; return <div key={String(label)} style={{ ...card, borderLeft: `3px solid ${color}`, marginBottom: 0 }}><MetricIcon size={15} color={String(color)} /><div style={{ color: "#94a3b8", fontSize: "0.76rem", marginTop: "0.5rem" }}>{String(label)}</div><strong style={{ display: "block", color: String(color), fontSize: "1.35rem", marginTop: "0.2rem" }}>{String(value)}</strong></div>; })}</div>
          {data.eftPending.length > 0 ? <EftReconciliationPanel payments={data.eftPending} onComplete={() => load("overview")} /> : <div style={card}><CheckCircle2 color="#22c55e" size={19} style={{ verticalAlign: "middle", marginRight: "0.4rem" }} /><strong>No EFT payments are awaiting reconciliation.</strong></div>}
        </>}
        {tab === "pending" && data && <><h1 style={{ fontSize: "1.2rem", margin: "0 0 0.8rem" }}>EFT Reconciliation Inbox</h1><p style={{ color: "#94a3b8", marginTop: 0, marginBottom: "1.2rem" }}>Review company, quote, expected amount, claimed amount, EFT reference and proof before making a finance decision.</p><EftReconciliationPanel payments={data.eftPending} onComplete={() => load("pending")} /></>}
        {tab === "transactions" && <div style={card}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}><h1 style={{ fontSize: "1.05rem", margin: 0 }}>Ledger — All Companies</h1><button onClick={exportCsv} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", borderRadius: "0.5rem", padding: "0.45rem 0.7rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><Download size={14} /> Export CSV</button></div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: "760px" }}><thead><tr>{["Date", "Company", "Type", "Description", "Reference", "Amount", "Status"].map((heading) => <th key={heading} style={th}>{heading}</th>)}</tr></thead><tbody>{entries.map((entry) => { const color = entryColor[entry.entry_type] || "#94a3b8"; return <tr key={entry.id}><td style={td}>{new Date(entry.created_at).toLocaleDateString("en-ZA")}</td><td style={{ ...td, fontWeight: 700 }}>{entry.companies?.name || "—"}</td><td style={td}><span style={{ color, background: `${color}18`, padding: "0.15rem 0.35rem", borderRadius: "0.25rem", fontSize: "0.72rem", fontWeight: 800 }}>{entry.entry_type}</span></td><td style={{ ...td, color: "#cbd5e1" }}>{entry.description}</td><td style={{ ...td, fontFamily: "monospace", color: "#94a3b8" }}>{entry.reference || "—"}</td><td style={{ ...td, color: entry.amount >= 0 ? "#86efac" : "#fca5a5", fontWeight: 800 }}>{entry.amount >= 0 ? "+" : ""}{fmt(entry.amount)}</td><td style={td}>{entry.status}</td></tr>; })}</tbody></table></div></div>}
        {tab === "client" && <>{!selectedCompany || !clientData ? <div style={card}>Select a company from an EFT record or the <Link href="/admin/companies" style={{ color: "#86efac" }}>Companies page</Link> to view its account.</div> : <><div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "1rem" }}><Building2 color="#86efac" size={20} /><h1 style={{ margin: 0, fontSize: "1.15rem" }}>{String(clientData.company?.name || "Company")}</h1></div><div style={card}><h2 style={{ fontSize: "0.95rem", marginTop: 0 }}>Account history</h2><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Date", "Type", "Description", "Reference", "Amount", "Status"].map((heading) => <th key={heading} style={th}>{heading}</th>)}</tr></thead><tbody>{clientData.entries.map((entry) => <tr key={entry.id}><td style={td}>{new Date(entry.created_at).toLocaleDateString("en-ZA")}</td><td style={td}>{entry.entry_type}</td><td style={td}>{entry.description}</td><td style={td}>{entry.reference || "—"}</td><td style={td}>{fmt(entry.amount)}</td><td style={td}>{entry.status}</td></tr>)}</tbody></table></div></>}</>}
      </>}
    </main>
  </div>;
}
