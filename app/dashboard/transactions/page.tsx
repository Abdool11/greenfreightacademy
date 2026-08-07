"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Download, Clock, CheckCircle2, AlertTriangle,
  Loader2, Receipt, CreditCard, Landmark, Zap,
} from "lucide-react";

interface LedgerEntry {
  id: string;
  entry_type: string;
  amount: number;
  description: string;
  reference?: string;
  status: string;
  created_at: string;
  driver_count?: number;
}

const TYPE_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  quote_issued:         { label: "Quote Issued",          color: "#6b7280", icon: Receipt },
  payment_received:     { label: "Payment Received",      color: "#22c55e", icon: CheckCircle2 },
  eft_submitted:        { label: "EFT Submitted",         color: "#f59e0b", icon: Clock },
  eft_confirmed:        { label: "EFT Confirmed",         color: "#22c55e", icon: CheckCircle2 },
  credits_allocated:    { label: "Credits Added",         color: "#3b82f6", icon: Zap },
  credits_used:         { label: "Credits Used",          color: "#a78bfa", icon: Zap },
  trial_credits:        { label: "Trial Credits",         color: "#3b82f6", icon: Zap },
  bulletin_payment:     { label: "Bulletin Payment",      color: "#f59e0b", icon: CreditCard },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2 }).format(n);

export default function TransactionsPage() {
  const [entries, setEntries]         = useState<LedgerEntry[]>([]);
  const [creditBalance, setCreditBalance] = useState(0);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetch("/api/company/transactions")
      .then(r => r.json())
      .then(d => {
        if (d.error === "Unauthorized") { window.location.href = "/login"; return; }
        setEntries(d.entries ?? []);
        setCreditBalance(d.creditBalance ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const pendingEntries  = entries.filter(e => e.status === "pending");
  const confirmedTotal  = entries.filter(e => e.entry_type === "payment_received" || e.entry_type === "eft_confirmed").reduce((s, e) => s + e.amount, 0);

  const exportCsv = () => {
    const rows = entries.map(e => [
      new Date(e.created_at).toLocaleDateString("en-ZA"),
      TYPE_META[e.entry_type]?.label ?? e.entry_type,
      e.description,
      e.reference ?? "",
      e.amount.toFixed(2),
      e.status,
    ]);
    const csv = ["Date,Type,Description,Reference,Amount (ZAR),Status", ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `GFA-Statement-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const s = {
    page:    { paddingTop: "5rem", background: "#0a1628", minHeight: "100vh", color: "#f9fafb" } as React.CSSProperties,
    header:  { background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "2rem 0" } as React.CSSProperties,
    inner:   { maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem 4rem" } as React.CSSProperties,
    card:    { background: "#0d1526", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.875rem", padding: "1.25rem", marginBottom: "1.25rem" } as React.CSSProperties,
    stat:    (accent: string) => ({ background: "#0d1526", border: `1px solid ${accent}25`, borderLeft: `3px solid ${accent}`, borderRadius: "0.75rem", padding: "1rem" }) as React.CSSProperties,
    th:      { padding: "0.625rem 0.875rem", color: "#6b7280", fontSize: "0.75rem", fontWeight: 700, textAlign: "left" as const, borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" as const },
    td:      { padding: "0.75rem 0.875rem", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.875rem", verticalAlign: "middle" as const },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div className="container-gfa">
          <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "#6b7280", fontSize: "0.875rem", textDecoration: "none", marginBottom: "1rem" }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <span className="pill-badge pill-green" style={{ marginBottom: "0.75rem", display: "inline-flex" }}>Account</span>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem" }}>Transaction History</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9375rem" }}>
            A complete record of all quotes, payments, and credit movements on your account.
          </p>
        </div>
      </div>

      <div style={s.inner}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280" }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: "0 auto 1rem", display: "block" }} />
            Loading your transactions…
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Credit Balance",    value: String(creditBalance),  accent: "#22c55e", Icon: Zap },
                { label: "Total Paid",         value: fmt(confirmedTotal),    accent: "#3b82f6", Icon: CreditCard },
                { label: "Pending Items",      value: String(pendingEntries.length), accent: pendingEntries.length > 0 ? "#f59e0b" : "#22c55e", Icon: Clock },
                { label: "Transactions",       value: String(entries.length), accent: "#a78bfa", Icon: Receipt },
              ].map(m => (
                <div key={m.label} style={s.stat(m.accent)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
                    <m.Icon size={13} style={{ color: m.accent }} />
                    <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>{m.label}</span>
                  </div>
                  <div style={{ fontSize: "1.375rem", fontWeight: 700, color: m.accent }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Pending banner */}
            {pendingEntries.length > 0 && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "0.875rem", padding: "1rem 1.25rem", marginBottom: "1.25rem", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <AlertTriangle size={18} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <p style={{ margin: "0 0 0.25rem", fontWeight: 700, color: "#f9fafb" }}>
                    {pendingEntries.length} pending {pendingEntries.length === 1 ? "item" : "items"} awaiting confirmation
                  </p>
                  <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.875rem" }}>
                    {pendingEntries.some(e => e.entry_type === "eft_submitted")
                      ? "Your EFT payment has been received and is being verified by our team. This is usually confirmed within 1 business day."
                      : "These items are being processed."}
                  </p>
                </div>
              </div>
            )}

            {/* Transaction table */}
            <div style={s.card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: "0.9375rem" }}>All Transactions</h3>
                <button
                  onClick={exportCsv}
                  style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", padding: "0.375rem 0.875rem", color: "#9ca3af", fontSize: "0.8125rem", cursor: "pointer" }}
                >
                  <Download size={13} /> Download Statement
                </button>
              </div>

              {entries.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#4b5563" }}>
                  <Receipt size={32} style={{ margin: "0 auto 0.75rem", display: "block" }} />
                  <p style={{ margin: 0 }}>No transactions yet. Generate a quote to get started.</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Date", "Type", "Description", "Reference", "Amount", "Status"].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(e => {
                        const meta  = TYPE_META[e.entry_type] ?? { label: e.entry_type, color: "#6b7280", icon: Receipt };
                        const Icon  = meta.icon;
                        const isPos = e.amount >= 0;
                        return (
                          <tr key={e.id}>
                            <td style={{ ...s.td, color: "#9ca3af", whiteSpace: "nowrap" }}>
                              {new Date(e.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td style={s.td}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", background: meta.color + "18", color: meta.color, borderRadius: "0.375rem", padding: "0.2rem 0.5rem", fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                                <Icon size={11} /> {meta.label}
                              </span>
                            </td>
                            <td style={{ ...s.td, color: "#d1d5db" }}>{e.description}</td>
                            <td style={{ ...s.td, color: "#9ca3af", fontFamily: "monospace", fontSize: "0.8125rem" }}>
                              {e.reference ?? "—"}
                            </td>
                            <td style={{ ...s.td, fontWeight: 700, color: isPos ? "#22c55e" : "#ef4444", whiteSpace: "nowrap" }}>
                              {isPos ? "+" : ""}{fmt(e.amount)}
                            </td>
                            <td style={s.td}>
                              <span style={{
                                background: e.status === "confirmed" ? "rgba(34,197,94,0.12)" : e.status === "pending" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                                color:      e.status === "confirmed" ? "#22c55e"               : e.status === "pending" ? "#f59e0b"               : "#ef4444",
                                borderRadius: "9999px", padding: "0.125rem 0.5rem", fontSize: "0.6875rem", fontWeight: 700,
                              }}>
                                {e.status === "pending" ? "Pending" : e.status === "confirmed" ? "Confirmed" : e.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Help note */}
            <p style={{ color: "#4b5563", fontSize: "0.8125rem", textAlign: "center" }}>
              Need a formal invoice or tax statement? Contact us at{" "}
              <a href="mailto:support@greenfreightacademy.co.za" style={{ color: "#22c55e" }}>
                support@greenfreightacademy.co.za
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
