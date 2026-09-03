"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FilePlus2, FileText, Loader2, RefreshCw, ReceiptText } from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  company_id: string;
  status: string;
  total: number;
  amount_paid: number;
  amount_due: number;
  issued_at?: string;
  due_at?: string;
  companies?: { name?: string } | null;
}

const money = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(value || 0));
const date = (value?: string) => value ? new Date(value).toLocaleDateString("en-ZA") : "—";

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quoteId, setQuoteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/invoices");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load invoices.");
      setInvoices(data.invoices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load invoices.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const issue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!quoteId.trim()) return;
    setIssuing(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoteId: quoteId.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not issue invoice.");
      setMessage(`Issued ${data.invoice.invoice_number}.`);
      setQuoteId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue invoice.");
    } finally { setIssuing(false); }
  };

  const card: React.CSSProperties = { background: "#0d1526", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.875rem", padding: "1.25rem" };
  const th: React.CSSProperties = { padding: "0.65rem 0.75rem", color: "#94a3b8", fontSize: "0.71rem", fontWeight: 800, textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.82rem" };

  return <div style={{ minHeight: "100vh", background: "#0a1628", color: "#f8fafc", paddingTop: "5rem" }}>
    <nav style={{ background: "#111f3a", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.5rem" }}><div style={{ maxWidth: "1180px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><Link href="/admin/finance" style={{ color: "#94a3b8", fontSize: "0.85rem", textDecoration: "none" }}>← Finance & Ledger</Link><span style={{ margin: "0 0.6rem", color: "#475569" }}>/</span><strong style={{ fontSize: "0.9rem" }}>Commercial Invoices</strong></div><button onClick={load} style={{ background: "transparent", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "0.5rem", padding: "0.45rem 0.75rem", cursor: "pointer", display: "inline-flex", gap: "0.35rem", alignItems: "center" }}><RefreshCw size={14} /> Refresh</button></div></nav>
    <main style={{ maxWidth: "1180px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem" }}><ReceiptText color="#22c55e" size={26} /><div><h1 style={{ margin: 0, fontSize: "1.35rem" }}>Commercial Invoices</h1><p style={{ margin: "0.25rem 0 0", color: "#94a3b8", fontSize: "0.88rem" }}>Issue one immutable invoice from an eligible quote. The quote and invoice remain separate records.</p></div></div>
      <form onSubmit={issue} style={{ ...card, marginBottom: "1.25rem", display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem", alignItems: "end" }}><label style={{ display: "grid", gap: "0.4rem", color: "#cbd5e1", fontSize: "0.78rem", fontWeight: 700 }}>Source quote UUID<input value={quoteId} onChange={(event) => setQuoteId(event.target.value)} placeholder="Paste an eligible GFA quote UUID" style={{ width: "100%", background: "#060e1a", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "0.5rem", padding: "0.7rem 0.8rem", fontFamily: "monospace" }} /></label><button disabled={issuing || !quoteId.trim()} style={{ background: "#22c55e", color: "#07130a", border: 0, borderRadius: "0.55rem", padding: "0.75rem 1rem", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem", opacity: issuing ? 0.7 : 1 }}>{issuing ? <Loader2 className="animate-spin" size={16} /> : <FilePlus2 size={16} />}{issuing ? "Issuing…" : "Issue invoice"}</button></form>
      <div style={{ ...card, marginBottom: "1.25rem", borderColor: "rgba(245,158,11,0.28)", background: "rgba(245,158,11,0.07)", color: "#fde68a", fontSize: "0.83rem" }}>A tax invoice label is shown only when the supplier snapshot includes a VAT number and a positive VAT rate. Confirm VAT registration, VAT percentage and invoice wording in Commercial Document Settings before issuing documents for external use.</div>
      {message && <div style={{ ...card, marginBottom: "1rem", borderColor: "rgba(34,197,94,0.34)", color: "#bbf7d0" }}>{message}</div>}
      {error && <div style={{ ...card, marginBottom: "1rem", borderColor: "rgba(239,68,68,0.34)", color: "#fecaca" }}>{error}</div>}
      <div style={card}>{loading ? <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}><Loader2 className="animate-spin" size={25} style={{ margin: "0 auto 0.65rem" }} />Loading invoices…</div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: "870px" }}><thead><tr>{["Invoice", "Company", "Issued", "Due", "Status", "Total", "Paid", "Due", "PDF"].map((heading) => <th key={heading} style={th}>{heading}</th>)}</tr></thead><tbody>{invoices.length === 0 ? <tr><td colSpan={9} style={{ ...td, color: "#94a3b8", textAlign: "center", padding: "2rem" }}>No invoices have been issued yet.</td></tr> : invoices.map((invoice) => <tr key={invoice.id}><td style={{ ...td, fontFamily: "monospace", fontWeight: 800 }}>{invoice.invoice_number}</td><td style={td}>{invoice.companies?.name || "—"}</td><td style={td}>{date(invoice.issued_at)}</td><td style={td}>{date(invoice.due_at)}</td><td style={td}><span style={{ color: invoice.status === "paid" ? "#86efac" : "#fde68a", fontWeight: 800 }}>{invoice.status.replace(/_/g, " ")}</span></td><td style={td}>{money(invoice.total)}</td><td style={td}>{money(invoice.amount_paid)}</td><td style={{ ...td, fontWeight: 800 }}>{money(invoice.amount_due)}</td><td style={td}><a href={`/api/company/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer" style={{ color: "#93c5fd", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><FileText size={14} /> PDF</a></td></tr>)}</tbody></table></div>}</div>
    </main>
  </div>;
}
