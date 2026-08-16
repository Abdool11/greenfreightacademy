"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Landmark, Loader2, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";

type Details = {
  quote: { id: string; reference: string; total: number; valid_until?: string | null };
  supplier: Record<string, string>;
};
const fmt = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value);

function EftSubmissionContent() {
  const params = useSearchParams();
  const quoteId = params.get("quoteId");
  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(true);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ message: string; varianceAmount: number } | null>(null);

  useEffect(() => {
    if (!quoteId) { setError("A quote reference is required to submit an EFT notice."); setLoading(false); return; }
    fetch(`/api/company/eft-payment?quoteId=${encodeURIComponent(quoteId)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load the EFT details.");
        setDetails(result); setAmount(Number(result.quote.total).toFixed(2));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load EFT details."))
      .finally(() => setLoading(false));
  }, [quoteId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!quoteId || !details) return;
    setSubmitting(true); setError("");
    try {
      const body = new FormData();
      body.set("quoteId", quoteId); body.set("eftReference", reference); body.set("eftAmount", amount); body.set("eftDate", date); body.set("notes", notes);
      if (proof) body.set("proof", proof);
      const response = await fetch("/api/company/eft-payment", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit the EFT notice.");
      setSuccess({ message: result.message, varianceAmount: Number(result.varianceAmount || 0) });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not submit the EFT notice."); }
    finally { setSubmitting(false); }
  };

  const shell: React.CSSProperties = { minHeight: "100vh", background: "#0a1628", color: "#f8fafc", padding: "6rem 1.25rem 3rem" };
  if (loading) return <div style={shell}><div style={{ textAlign: "center", paddingTop: "8rem", color: "#94a3b8" }}><Loader2 size={28} className="animate-spin" style={{ margin: "0 auto 0.75rem" }} />Loading payment instructions…</div></div>;
  if (error && !details) return <div style={shell}><div style={{ maxWidth: "620px", margin: "0 auto", background: "#111f3a", border: "1px solid rgba(239,68,68,0.35)", borderRadius: "1rem", padding: "1.5rem" }}><AlertTriangle color="#fca5a5" /><h1>Unable to prepare EFT payment</h1><p style={{ color: "#fecaca" }}>{error}</p><Link href="/dashboard" style={{ color: "#86efac" }}>← Return to dashboard</Link></div></div>;
  if (!details) return null;
  const expected = Number(details.quote.total);
  const entered = Number(amount || 0);
  const variance = Number.isFinite(entered) ? Math.round((entered - expected) * 100) / 100 : 0;
  const bankReady = Boolean(details.supplier.bank_name && details.supplier.bank_account && details.supplier.bank_account_holder);

  return <div style={shell}><main style={{ maxWidth: "980px", margin: "0 auto" }}>
    <Link href="/dashboard" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.85rem", display: "inline-flex", gap: "0.35rem", alignItems: "center", marginBottom: "1.2rem" }}><ArrowLeft size={15} /> Back to dashboard</Link>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(320px, 0.95fr)", gap: "1.25rem" }}>
      <section style={{ background: "#111f3a", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "1rem", padding: "1.5rem" }}>
        {success ? <><CheckCircle2 color="#86efac" size={42} /><h1 style={{ marginBottom: "0.5rem" }}>EFT notice submitted</h1><p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>{success.message}</p>{success.varianceAmount !== 0 && <div style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.28)", color: "#fde68a", borderRadius: "0.65rem", padding: "0.8rem", fontSize: "0.86rem" }}>The submitted amount differs from your quote. Finance will review it before training can be deployed.</div>}<Link href="/dashboard" style={{ marginTop: "1.2rem", display: "inline-block", background: "#22c55e", color: "#07130a", textDecoration: "none", fontWeight: 800, padding: "0.7rem 1rem", borderRadius: "0.55rem" }}>Return to dashboard</Link></> : <form onSubmit={submit}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", color: "#86efac" }}><Landmark size={19} /><strong>Pay by EFT</strong></div><h1 style={{ fontSize: "1.45rem", margin: "0.65rem 0 0.3rem" }}>Submit your payment notice</h1><p style={{ color: "#94a3b8", marginTop: 0, lineHeight: 1.55 }}>After paying the EFT, give us the bank reference and amount exactly as they appear on the payment. Uploading proof of payment is optional but helps us verify more quickly.</p>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, margin: "1rem 0 0.35rem" }}>Bank / EFT reference *</label><input required value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Reference shown on your bank payment" style={{ width: "100%", boxSizing: "border-box", background: "#0a1628", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "0.5rem", padding: "0.72rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}><div><label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, margin: "1rem 0 0.35rem" }}>Amount paid *</label><input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#0a1628", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "0.5rem", padding: "0.72rem" }} /></div><div><label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, margin: "1rem 0 0.35rem" }}>Payment date *</label><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#0a1628", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "0.5rem", padding: "0.72rem" }} /></div></div>
          <div style={{ marginTop: "0.7rem", padding: "0.65rem", borderRadius: "0.5rem", background: variance === 0 ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.12)", color: variance === 0 ? "#86efac" : "#fde68a", fontSize: "0.82rem" }}><strong>Quote total:</strong> {fmt(expected)} · <strong>{variance === 0 ? "Amount matches" : `Difference: ${fmt(variance)}`}</strong></div>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, margin: "1rem 0 0.35rem" }}>Proof of payment <span style={{ color: "#94a3b8", fontWeight: 400 }}>(PDF, JPG or PNG; max 10 MB)</span></label><label style={{ display: "flex", gap: "0.55rem", alignItems: "center", border: "1px dashed rgba(255,255,255,0.22)", borderRadius: "0.55rem", padding: "0.75rem", color: "#cbd5e1", cursor: "pointer" }}><Upload size={17} /><span style={{ fontSize: "0.84rem" }}>{proof ? proof.name : "Choose a file"}</span><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setProof(event.target.files?.[0] || null)} style={{ display: "none" }} /></label>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, margin: "1rem 0 0.35rem" }}>Note to finance <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="For example, payer name differs from company name" style={{ width: "100%", boxSizing: "border-box", background: "#0a1628", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "0.5rem", padding: "0.72rem", resize: "vertical" }} />
          {error && <p style={{ color: "#fca5a5", fontSize: "0.85rem" }}>{error}</p>}<button type="submit" disabled={submitting} style={{ marginTop: "1.2rem", width: "100%", background: "#22c55e", color: "#07130a", border: "none", borderRadius: "0.55rem", padding: "0.8rem", fontWeight: 800, cursor: "pointer", opacity: submitting ? 0.6 : 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem" }}>{submitting && <Loader2 className="animate-spin" size={16} />}Submit for verification</button>
        </form>}
      </section>
      <aside style={{ background: "#0d1526", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1rem", padding: "1.5rem", height: "fit-content" }}><div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><FileText size={18} color="#60a5fa" /><strong>Quote payment details</strong></div><div style={{ margin: "1rem 0", borderTop: "1px solid rgba(255,255,255,0.08)" }} /><div style={{ display: "grid", gap: "0.55rem", fontSize: "0.88rem" }}><div><span style={{ color: "#94a3b8" }}>Quote reference</span><strong style={{ display: "block", fontFamily: "monospace" }}>{details.quote.reference}</strong></div><div><span style={{ color: "#94a3b8" }}>Amount due</span><strong style={{ display: "block", color: "#86efac", fontSize: "1.25rem" }}>{fmt(expected)}</strong></div>{details.quote.valid_until && <div><span style={{ color: "#94a3b8" }}>Valid until</span><strong style={{ display: "block" }}>{new Date(details.quote.valid_until).toLocaleDateString("en-ZA")}</strong></div>}</div><div style={{ margin: "1.25rem 0", borderTop: "1px solid rgba(255,255,255,0.08)" }} />{bankReady ? <div style={{ fontSize: "0.86rem", lineHeight: 1.65 }}><strong style={{ color: "#86efac" }}>Banking details</strong><p style={{ margin: "0.5rem 0" }}><span style={{ color: "#94a3b8" }}>Bank</span><br />{details.supplier.bank_name}</p><p style={{ margin: "0.5rem 0" }}><span style={{ color: "#94a3b8" }}>Account holder</span><br />{details.supplier.bank_account_holder}</p><p style={{ margin: "0.5rem 0" }}><span style={{ color: "#94a3b8" }}>Account number</span><br /><strong>{details.supplier.bank_account}</strong></p><p style={{ margin: "0.5rem 0" }}><span style={{ color: "#94a3b8" }}>Branch code</span><br />{details.supplier.bank_branch || "—"}</p></div> : <div style={{ color: "#fde68a", fontSize: "0.85rem", lineHeight: 1.5 }}><AlertTriangle size={16} style={{ verticalAlign: "middle", marginRight: "0.35rem" }} />EFT banking details are not yet configured. Please contact the GFA team before making payment.</div>}<p style={{ color: "#94a3b8", fontSize: "0.78rem", lineHeight: 1.5, marginTop: "1.25rem" }}>Training can be deployed after finance has matched and confirmed your EFT payment.</p></aside>
    </div>
  </main></div>;
}

export default function EftSubmissionPage() {
  return <Suspense fallback={<div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a1628", color: "#94a3b8" }}><Loader2 className="animate-spin" /></div>}><EftSubmissionContent /></Suspense>;
}
