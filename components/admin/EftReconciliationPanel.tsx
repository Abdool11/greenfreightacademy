"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2, SearchCheck, XCircle } from "lucide-react";

export interface EftReconciliationPayment {
  id: string;
  amount: number;
  eft_reference?: string | null;
  eft_date?: string | null;
  proof_url?: string | null;
  proof_file_name?: string | null;
  expected_amount_snapshot?: number | null;
  variance_amount?: number | null;
  reconciliation_status?: string | null;
  reconciliation_notes?: string | null;
  created_at: string;
  quotes?: {
    id: string;
    reference: string;
    total: number;
    companies?: { id: string; name: string; contact_email?: string | null } | null;
  } | null;
}

const fmt = (amount: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount);
const age = (date: string) => {
  const hours = Math.floor((Date.now() - new Date(date).getTime()) / 3_600_000);
  if (hours < 24) return { label: hours < 1 ? "<1h" : `${hours}h`, color: "#22c55e" };
  if (hours < 48) return { label: `${Math.floor(hours / 24)}d`, color: "#f59e0b" };
  return { label: `${Math.floor(hours / 24)}d overdue`, color: "#ef4444" };
};

export default function EftReconciliationPanel({ payments, onComplete }: { payments: EftReconciliationPayment[]; onComplete: () => void }) {
  const [selected, setSelected] = useState<EftReconciliationPayment | null>(null);
  const [decision, setDecision] = useState<"confirm" | "request_clarification" | "reject">("confirm");
  const [bankReference, setBankReference] = useState("");
  const [bankDate, setBankDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const open = (payment: EftReconciliationPayment) => {
    setSelected(payment);
    setDecision(Number(payment.variance_amount ?? 0) === 0 ? "confirm" : "request_clarification");
    setBankReference("");
    setBankDate("");
    setNotes(payment.reconciliation_notes || "");
    setError("");
  };

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/admin/payments/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: selected.id, decision, bankTransactionReference: bankReference, bankTransactionDate: bankDate, reconciliationNotes: notes }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Could not save the reconciliation decision."); return; }
      setSelected(null);
      onComplete();
    } catch { setError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  };

  if (payments.length === 0) return <div style={{ border: "1px solid rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.06)", borderRadius: "0.875rem", padding: "2.5rem", textAlign: "center", color: "#86efac" }}><CheckCircle2 size={32} style={{ margin: "0 auto 0.75rem" }} /><strong>No EFT payments need reconciliation.</strong></div>;

  return (
    <>
      <div style={{ overflowX: "auto", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "0.875rem", background: "#0d1526" }}>
        <div style={{ padding: "1.1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: "0.5rem" }}><AlertTriangle size={17} color="#f59e0b" /><div><strong>Reconciliation Inbox</strong><p style={{ margin: "0.2rem 0 0", color: "#94a3b8", fontSize: "0.78rem" }}>Confirm only against an identifiable bank transaction. Payment amount must match the quote until a governed discount or adjustment is approved.</p></div></div>
        <table style={{ width: "100%", minWidth: "930px", borderCollapse: "collapse" }}>
          <thead><tr>{["Client / quote", "Expected", "Claimed", "Variance", "EFT reference", "Proof", "Waiting", "Action"].map((heading) => <th key={heading} style={{ padding: "0.65rem 0.8rem", color: "#94a3b8", fontSize: "0.72rem", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{heading}</th>)}</tr></thead>
          <tbody>{payments.map((payment) => {
            const quote = payment.quotes;
            const company = quote?.companies;
            const expected = Number(payment.expected_amount_snapshot ?? quote?.total ?? 0);
            const claimed = Number(payment.amount ?? 0);
            const variance = Number(payment.variance_amount ?? claimed - expected);
            const waiting = age(payment.created_at);
            return <tr key={payment.id}>
              <td style={{ padding: "0.8rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><strong style={{ display: "block", fontSize: "0.85rem" }}>{company?.name || "Unknown company"}</strong><span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: "0.75rem" }}>{quote?.reference || "—"}</span></td>
              <td style={{ padding: "0.8rem", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{fmt(expected)}</td>
              <td style={{ padding: "0.8rem", fontWeight: 700, color: "#dbeafe", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{fmt(claimed)}</td>
              <td style={{ padding: "0.8rem", fontWeight: 700, color: variance === 0 ? "#86efac" : "#fca5a5", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{variance === 0 ? "Matched" : fmt(variance)}</td>
              <td style={{ padding: "0.8rem", color: "#cbd5e1", fontFamily: "monospace", fontSize: "0.78rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{payment.eft_reference || "—"}</td>
              <td style={{ padding: "0.8rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{payment.proof_url ? <a href={`/api/admin/payments/${payment.id}/proof`} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", fontSize: "0.78rem", textDecoration: "none", display: "inline-flex", gap: "0.25rem", alignItems: "center" }}><FileText size={13} /> View proof</a> : <span style={{ color: "#64748b", fontSize: "0.78rem" }}>Not supplied</span>}</td>
              <td style={{ padding: "0.8rem", color: waiting.color, fontWeight: 700, fontSize: "0.78rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{waiting.label}</td>
              <td style={{ padding: "0.8rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><button onClick={() => open(payment)} style={{ background: "rgba(34,197,94,0.13)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac", borderRadius: "0.45rem", padding: "0.4rem 0.65rem", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem", display: "inline-flex", gap: "0.3rem", alignItems: "center" }}><SearchCheck size={13} /> Reconcile</button></td>
            </tr>;
          })}</tbody>
        </table>
      </div>

      {selected && (() => {
        const quote = selected.quotes;
        const expected = Number(selected.expected_amount_snapshot ?? quote?.total ?? 0);
        const claimed = Number(selected.amount ?? 0);
        const variance = Number(selected.variance_amount ?? claimed - expected);
        return <div onClick={() => !submitting && setSelected(null)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", display: "grid", placeItems: "center", padding: "1rem" }}><div onClick={(event) => event.stopPropagation()} style={{ maxWidth: "650px", width: "100%", maxHeight: "90vh", overflow: "auto", background: "#111f3a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "1rem", padding: "1.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Reconcile EFT payment</h2>
          <p style={{ color: "#94a3b8", margin: "0.45rem 0 1rem", fontSize: "0.85rem" }}>{quote?.companies?.name || "Client"} · <span style={{ fontFamily: "monospace" }}>{quote?.reference}</span></p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.7rem", marginBottom: "1rem" }}><div style={{ background: "#0a1628", padding: "0.7rem", borderRadius: "0.6rem" }}><small style={{ color: "#94a3b8" }}>Expected</small><strong style={{ display: "block", marginTop: "0.2rem" }}>{fmt(expected)}</strong></div><div style={{ background: "#0a1628", padding: "0.7rem", borderRadius: "0.6rem" }}><small style={{ color: "#94a3b8" }}>Claimed</small><strong style={{ display: "block", marginTop: "0.2rem" }}>{fmt(claimed)}</strong></div><div style={{ background: variance === 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", padding: "0.7rem", borderRadius: "0.6rem" }}><small style={{ color: "#94a3b8" }}>Variance</small><strong style={{ display: "block", marginTop: "0.2rem", color: variance === 0 ? "#86efac" : "#fca5a5" }}>{variance === 0 ? "Matched" : fmt(variance)}</strong></div></div>
          <div style={{ marginBottom: "1rem", color: "#cbd5e1", fontSize: "0.85rem" }}><strong>EFT reference:</strong> {selected.eft_reference || "—"}<br /><strong>Client payment date:</strong> {selected.eft_date || "—"}<br />{selected.proof_url && <a href={`/api/admin/payments/${selected.id}/proof`} target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>Open proof of payment</a>}</div>
          <label style={{ display: "block", marginBottom: "0.4rem", color: "#cbd5e1", fontSize: "0.8rem", fontWeight: 700 }}>Decision</label><select value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)} style={{ width: "100%", background: "#0a1628", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", padding: "0.7rem", marginBottom: "0.85rem" }}><option value="confirm" disabled={variance !== 0}>Confirm matched EFT</option><option value="request_clarification">Request clarification</option><option value="reject">Reject EFT notice</option></select>
          {decision === "confirm" && <><label style={{ display: "block", marginBottom: "0.4rem", color: "#cbd5e1", fontSize: "0.8rem", fontWeight: 700 }}>Bank transaction reference *</label><input value={bankReference} onChange={(event) => setBankReference(event.target.value)} placeholder="Reference shown on bank statement" style={{ width: "100%", boxSizing: "border-box", background: "#0a1628", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", padding: "0.7rem", marginBottom: "0.85rem" }} /><label style={{ display: "block", marginBottom: "0.4rem", color: "#cbd5e1", fontSize: "0.8rem", fontWeight: 700 }}>Bank transaction date</label><input type="date" value={bankDate} onChange={(event) => setBankDate(event.target.value)} style={{ background: "#0a1628", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", padding: "0.7rem", marginBottom: "0.85rem" }} /></>}
          <label style={{ display: "block", marginBottom: "0.4rem", color: "#cbd5e1", fontSize: "0.8rem", fontWeight: 700 }}>{decision === "confirm" ? "Internal reconciliation note (optional)" : "Explanation to client *"}</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} style={{ width: "100%", boxSizing: "border-box", background: "#0a1628", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.5rem", padding: "0.7rem", resize: "vertical" }} />
          {error && <p style={{ color: "#fca5a5", fontSize: "0.82rem" }}>{error}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.7rem", marginTop: "1.25rem" }}><button onClick={() => setSelected(null)} disabled={submitting} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.16)", color: "#e2e8f0", borderRadius: "0.5rem", padding: "0.65rem 0.9rem", cursor: "pointer" }}>Cancel</button><button onClick={submit} disabled={submitting || (decision === "confirm" && (!bankReference || variance !== 0))} style={{ background: decision === "reject" ? "#dc2626" : decision === "request_clarification" ? "#d97706" : "#22c55e", border: "none", color: "#07130a", borderRadius: "0.5rem", padding: "0.65rem 0.9rem", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem", opacity: submitting || (decision === "confirm" && (!bankReference || variance !== 0)) ? 0.55 : 1 }}>{submitting ? <Loader2 className="animate-spin" size={15} /> : decision === "reject" ? <XCircle size={15} /> : <CheckCircle2 size={15} />}{decision === "confirm" ? "Confirm EFT" : decision === "reject" ? "Reject notice" : "Request clarification"}</button></div>
        </div></div>;
      })()}
    </>
  );
}
