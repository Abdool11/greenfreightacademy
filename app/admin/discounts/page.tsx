"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BadgePercent, CheckCircle2, Loader2, Plus, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

type Quote = { id: string; reference: string; subtotal: number; total: number; status: string; companies?: { name: string } | null };
type Request = { id: string; request_reference: string; requested_percent: number; discount_amount: number; revised_total: number; reason_category: string; reason_note: string; supporting_reference?: string | null; status: string; requested_by_name: string; requested_at: string; approved_by_name?: string | null; quote_id: string; quotes?: { reference: string; total: number; companies?: { name: string } | null } | null };
type Rule = { role: string; max_request_percent: number; max_approval_percent: number; require_different_approver: boolean };
const money = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(value || 0));

export default function DiscountApprovalsPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ quoteId: "", discountType: "percentage", requestedValue: "", reasonCategory: "large_client", reasonNote: "", supportingReference: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/admin/discounts"); const result = await response.json(); setQuotes(result.quotes ?? []); setRequests(result.requests ?? []); setRules(result.rules ?? []); setRole(result.currentRole ?? ""); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault(); setMessage(""); setCreating(true);
    try {
      const response = await fetch("/api/admin/discounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...form, requestedValue: Number(form.requestedValue) }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || "Could not create discount request."); return; }
      setMessage("Discount request submitted for independent approval."); setForm({ quoteId: "", discountType: "percentage", requestedValue: "", reasonCategory: "large_client", reasonNote: "", supportingReference: "" }); await load();
    } catch { setMessage("Network error."); } finally { setCreating(false); }
  };

  const decide = async (request: Request, decision: "approve" | "reject") => {
    const approvalNote = decision === "reject" ? window.prompt("Explain why this request is rejected:") : window.prompt("Optional approval note:");
    if (decision === "reject" && !approvalNote) return;
    if (!window.confirm(`${decision === "approve" ? "Approve and apply" : "Reject"} discount ${request.request_reference}? This action is recorded in the audit trail.`)) return;
    setWorking(request.id); setMessage("");
    try { const response = await fetch("/api/admin/discounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decide", requestId: request.id, decision, approvalNote: approvalNote || "" }) }); const result = await response.json(); if (!response.ok) setMessage(result.error || "Could not save decision."); else { setMessage(decision === "approve" ? "Discount approved and revised quote issued." : "Discount request rejected."); await load(); } }
    catch { setMessage("Network error."); } finally { setWorking(null); }
  };

  const myRule = rules.find((item) => item.role === role);
  const pending = requests.filter((request) => request.status === "pending");
  return <div style={{ minHeight: "100vh", background: "#0a1628", color: "#f8fafc", paddingTop: "5rem" }}>
    <nav style={{ background: "#111f3a", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.5rem" }}><div style={{ maxWidth: "1120px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><Link href="/admin/dashboard" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.85rem" }}>← Dashboard</Link><span style={{ color: "#475569", margin: "0 0.55rem" }}>/</span><strong>Discount Approvals</strong></div><button onClick={load} style={{ background: "transparent", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "0.5rem", padding: "0.45rem 0.7rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}><RefreshCw size={14} /> Refresh</button></div></nav>
    <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      <div style={{ marginBottom: "1.25rem" }}><div style={{ display: "flex", gap: "0.55rem", alignItems: "center" }}><BadgePercent color="#fbbf24" /><h1 style={{ margin: 0, fontSize: "1.3rem" }}>Governed discounts</h1></div><p style={{ color: "#94a3b8", maxWidth: "780px", lineHeight: 1.55 }}>Every concession is requested with a reason, approved by a different authorised person, applied as a new quote version and retained in the audit trail. A payment variance cannot be confirmed until it is resolved by an approved commercial adjustment.</p></div>
      {message && <div style={{ marginBottom: "1rem", padding: "0.75rem", borderRadius: "0.6rem", background: message.includes("could") || message.includes("error") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: message.includes("could") || message.includes("error") ? "#fca5a5" : "#86efac" }}>{message}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.05fr)", gap: "1.25rem", alignItems: "start" }}>
        <form onSubmit={create} style={{ background: "#111f3a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.9rem", padding: "1.25rem" }}><div style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}><Plus size={17} color="#86efac" /><h2 style={{ fontSize: "1rem", margin: 0 }}>Request a discount</h2></div><p style={{ color: "#94a3b8", fontSize: "0.8rem", lineHeight: 1.5 }}>Only unpaid quotes appear here. The quote remains unchanged until an independently authorised approval is recorded.</p>
          <label style={labelStyle}>Quote *</label><select required value={form.quoteId} onChange={(event) => setForm({ ...form, quoteId: event.target.value })} style={inputStyle}><option value="">Select an unpaid quote</option>{quotes.map((quote) => <option key={quote.id} value={quote.id}>{quote.companies?.name || "Client"} · {quote.reference} · {money(quote.total)}</option>)}</select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}><div><label style={labelStyle}>Discount type *</label><select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value })} style={inputStyle}><option value="percentage">Percentage</option><option value="fixed_amount">Fixed ZAR amount</option></select></div><div><label style={labelStyle}>{form.discountType === "percentage" ? "Percentage *" : "Amount (ZAR) *"}</label><input required min="0.01" max={form.discountType === "percentage" ? "100" : undefined} step="0.01" type="number" value={form.requestedValue} onChange={(event) => setForm({ ...form, requestedValue: event.target.value })} style={inputStyle} /></div></div>
          <label style={labelStyle}>Reason category *</label><select value={form.reasonCategory} onChange={(event) => setForm({ ...form, reasonCategory: event.target.value })} style={inputStyle}><option value="large_client">Large client / volume commitment</option><option value="launch_offer">Launch offer</option><option value="strategic_account">Strategic account</option><option value="tender">Tender / negotiated contract</option><option value="special_project">Special project</option><option value="correction">Commercial correction</option><option value="other">Other</option></select>
          <label style={labelStyle}>Business reason *</label><textarea required rows={4} value={form.reasonNote} onChange={(event) => setForm({ ...form, reasonNote: event.target.value })} placeholder="Why is this concession commercially justified?" style={{ ...inputStyle, resize: "vertical" }} />
          <label style={labelStyle}>Supporting reference <span style={{ color: "#64748b", fontWeight: 400 }}>(optional)</span></label><input value={form.supportingReference} onChange={(event) => setForm({ ...form, supportingReference: event.target.value })} placeholder="Tender, email approval, campaign or contract reference" style={inputStyle} />
          <button disabled={creating || loading} type="submit" style={{ width: "100%", marginTop: "1rem", background: "#22c55e", color: "#07130a", border: "none", borderRadius: "0.55rem", padding: "0.75rem", fontWeight: 800, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem", opacity: creating ? 0.6 : 1 }}>{creating && <Loader2 className="animate-spin" size={15} />}Submit for approval</button>
          {myRule && <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginBottom: 0 }}>Your role may request up to {myRule.max_request_percent}% and may approve up to {myRule.max_approval_percent}%.</p>}
        </form>
        <section style={{ background: "#0d1526", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.9rem", padding: "1.25rem" }}><div style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}><ShieldCheck size={17} color="#60a5fa" /><h2 style={{ fontSize: "1rem", margin: 0 }}>Authority controls</h2></div><table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.75rem" }}><thead><tr>{["Role", "May request", "May approve", "Self-approval"].map((heading) => <th key={heading} style={thStyle}>{heading}</th>)}</tr></thead><tbody>{rules.map((rule) => <tr key={rule.role}><td style={tdStyle}>{rule.role.replaceAll("_", " ")}</td><td style={tdStyle}>{rule.max_request_percent}%</td><td style={tdStyle}>{rule.max_approval_percent}%</td><td style={tdStyle}>{rule.require_different_approver ? "Blocked" : "Allowed"}</td></tr>)}</tbody></table><p style={{ color: "#94a3b8", fontSize: "0.78rem", lineHeight: 1.5, marginBottom: 0 }}>The current policy is seeded in the database so it can be adjusted through a future super-admin policy screen without rewriting commercial logic.</p></section>
      </div>
      <section style={{ marginTop: "1.25rem", background: "#0d1526", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.9rem", padding: "1.25rem" }}><h2 style={{ margin: 0, fontSize: "1rem" }}>Requests and audit status</h2>{loading ? <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}><Loader2 className="animate-spin" style={{ margin: "0 auto" }} /></div> : requests.length === 0 ? <p style={{ color: "#94a3b8" }}>No discount requests have been recorded.</p> : <div style={{ overflowX: "auto", marginTop: "0.8rem" }}><table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse" }}><thead><tr>{["Request", "Client / quote", "Concession", "Revised total", "Reason", "Requested by", "Status", "Decision"].map((heading) => <th key={heading} style={thStyle}>{heading}</th>)}</tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td style={tdStyle}><strong>{request.request_reference}</strong><br /><small style={{ color: "#64748b" }}>{new Date(request.requested_at).toLocaleDateString("en-ZA")}</small></td><td style={tdStyle}>{request.quotes?.companies?.name || "—"}<br /><span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: "0.76rem" }}>{request.quotes?.reference || "—"}</span></td><td style={tdStyle}><strong style={{ color: "#fcd34d" }}>{request.requested_percent}%</strong><br />{money(request.discount_amount)}</td><td style={tdStyle}>{money(request.revised_total)}</td><td style={tdStyle}><strong>{request.reason_category.replaceAll("_", " ")}</strong><br /><span style={{ color: "#94a3b8", fontSize: "0.76rem" }}>{request.reason_note}</span></td><td style={tdStyle}>{request.requested_by_name}</td><td style={tdStyle}><span style={{ color: request.status === "pending" ? "#fcd34d" : request.status === "applied" ? "#86efac" : "#fca5a5", fontWeight: 800, textTransform: "capitalize" }}>{request.status}</span></td><td style={tdStyle}>{request.status === "pending" ? <div style={{ display: "flex", gap: "0.4rem" }}><button disabled={working === request.id} onClick={() => decide(request, "approve")} style={approveStyle}><CheckCircle2 size={13} /> Approve</button><button disabled={working === request.id} onClick={() => decide(request, "reject")} style={rejectStyle}><XCircle size={13} /> Reject</button></div> : <span style={{ color: "#94a3b8", fontSize: "0.76rem" }}>{request.approved_by_name || "Recorded"}</span>}</td></tr>)}</tbody></table></div>}</section>
    </main>
  </div>;
}
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.78rem", fontWeight: 800, color: "#cbd5e1", margin: "0.85rem 0 0.35rem" };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "#0a1628", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "0.5rem", padding: "0.68rem" };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "0.62rem", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: "0.72rem" };
const tdStyle: React.CSSProperties = { padding: "0.7rem 0.62rem", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "top", fontSize: "0.82rem" };
const approveStyle: React.CSSProperties = { border: "none", borderRadius: "0.4rem", background: "#22c55e", color: "#07130a", fontWeight: 800, padding: "0.38rem 0.55rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem" };
const rejectStyle: React.CSSProperties = { border: "1px solid rgba(239,68,68,0.4)", borderRadius: "0.4rem", background: "rgba(239,68,68,0.08)", color: "#fca5a5", fontWeight: 800, padding: "0.38rem 0.55rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem" };
