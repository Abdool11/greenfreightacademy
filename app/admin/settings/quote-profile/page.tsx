"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, FileText, Landmark, Loader2, Save, ShieldAlert } from "lucide-react";

const DEFAULTS: Record<string, string> = {
  company_name: "",
  company_trading_name: "",
  company_registration_number: "",
  company_vat_number: "",
  company_address: "",
  company_email: "",
  company_phone: "",
  company_bank_name: "",
  company_bank_account: "",
  company_bank_branch: "",
  company_bank_account_holder: "",
  company_bank_account_type: "",
  company_bank_product_type: "",
  quote_validity_days: "14",
  quote_payment_terms: "Payment is required before training is deployed.",
  quote_terms_note: "",
  company_vat_rate: "15",
  invoice_due_days: "14",
  invoice_payment_terms: "Payment is due by the date stated on this invoice.",
};

const inputStyle = { width: "100%", padding: "0.7rem 0.8rem", background: "#060e1a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "0.5rem", color: "#f8fafc", fontSize: "0.875rem", outline: "none" };
const labelStyle = { display: "block", color: "#cbd5e1", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.35rem" };

export default function QuoteProfileSettingsPage() {
  const [config, setConfig] = useState<Record<string, string>>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/quote-profile")
      .then(async (res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data) => setConfig((previous) => ({ ...previous, ...(data.config || {}) })))
      .catch(() => setError("Could not load formal quote settings."))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => { setConfig((previous) => ({ ...previous, [key]: value })); setSaved(false); };
  const save = async () => {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/settings/quote-profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed");
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save quote settings.");
    } finally { setSaving(false); }
  };

  const textField = (key: string, label: string, placeholder = "") => (
    <div><label style={labelStyle}>{label}</label><input style={inputStyle} value={config[key] || ""} onChange={(e) => update(key, e.target.value)} placeholder={placeholder} /></div>
  );
  const numberField = (key: string, label: string, min: number, max: number, step = "1") => (
    <div><label style={labelStyle}>{label}</label><input type="number" min={min} max={max} step={step} style={inputStyle} value={config[key] || ""} onChange={(e) => update(key, e.target.value)} /></div>
  );

  if (loading) return <div className="min-h-screen bg-[#0a1628] grid place-items-center"><Loader2 className="animate-spin" color="#22c55e" /></div>;

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <header className="bg-[#111f3a] border-b border-slate-700/50 px-6 py-4"><div className="max-w-5xl mx-auto flex items-center justify-between"><div><Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-2"><ArrowLeft size={14} /> Admin dashboard</Link><h1 className="text-xl font-bold">Formal Commercial Document Settings</h1></div><FileText className="text-[#2ecc71]" size={28} /></div></header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 flex gap-3 text-amber-100 text-sm"><ShieldAlert size={20} className="shrink-0 mt-0.5" /><p className="m-0">These details are copied into formal quotations and invoices. Check the legal entity, VAT number, VAT percentage, banking details and payment terms carefully before issuing any commercial document.</p></div>
        {error && <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">{error}</div>}
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-700/50 bg-[#111f3a] p-6"><div className="flex items-center gap-2 mb-1"><Building2 size={18} className="text-[#2ecc71]" /><h2 className="font-semibold">Supplier details</h2></div><p className="text-slate-400 text-sm mb-5">The supplier identity shown at the top of each formal GFA quote.</p><div className="grid md:grid-cols-2 gap-4">{textField("company_name", "Legal entity name", "e.g. Green Freight Academy (Pty) Ltd")}{textField("company_trading_name", "Trading name", "Optional")}{textField("company_registration_number", "Company registration number", "Optional")}{textField("company_vat_number", "VAT number", "Leave blank until registered")}{numberField("company_vat_rate", "VAT percentage", 0, 100, "0.01")}{textField("company_email", "Quote and accounts email")}{textField("company_phone", "Phone number")}</div><div className="mt-4"><label style={labelStyle}>Supplier physical / billing address</label><textarea style={{ ...inputStyle, minHeight: "84px", resize: "vertical" }} value={config.company_address || ""} onChange={(e) => update("company_address", e.target.value)} placeholder={"Street address\nSuburb, city\nPostal code"} /></div></section>
          <section className="rounded-xl border border-slate-700/50 bg-[#111f3a] p-6"><div className="flex items-center gap-2 mb-1"><Landmark size={18} className="text-blue-300" /><h2 className="font-semibold">EFT payment details</h2></div><p className="text-slate-400 text-sm mb-5">Shown only on client formal quotes. Do not use personal banking details.</p><div className="grid md:grid-cols-2 gap-4">{textField("company_bank_name", "Bank name")}{textField("company_bank_account_holder", "Account holder")}{textField("company_bank_account", "Account number")}{textField("company_bank_branch", "Branch code")}{textField("company_bank_account_type", "Account type", "e.g. Business Cheque")}{textField("company_bank_product_type", "Product / account description", "Optional")}</div></section>
          <section className="rounded-xl border border-slate-700/50 bg-[#111f3a] p-6"><div className="flex items-center gap-2 mb-1"><FileText size={18} className="text-purple-300" /><h2 className="font-semibold">Commercial terms</h2></div><p className="text-slate-400 text-sm mb-5">These fields are copied into each quotation or invoice snapshot when that document is issued.</p><div className="grid md:grid-cols-3 gap-4"><div>{numberField("quote_validity_days", "Quote validity (days)", 1, 365)}</div><div>{numberField("invoice_due_days", "Invoice payment due (days)", 0, 365)}</div></div><div className="mt-4"><label style={labelStyle}>Quotation payment terms</label><textarea style={{ ...inputStyle, minHeight: "70px", resize: "vertical" }} value={config.quote_payment_terms || ""} onChange={(e) => update("quote_payment_terms", e.target.value)} /></div><div className="mt-4"><label style={labelStyle}>Invoice payment terms</label><textarea style={{ ...inputStyle, minHeight: "70px", resize: "vertical" }} value={config.invoice_payment_terms || ""} onChange={(e) => update("invoice_payment_terms", e.target.value)} /></div><div className="mt-4"><label style={labelStyle}>Optional commercial / procurement note</label><textarea style={{ ...inputStyle, minHeight: "70px", resize: "vertical" }} value={config.quote_terms_note || ""} onChange={(e) => update("quote_terms_note", e.target.value)} placeholder="Optional — e.g. payment reference or procurement guidance" /></div></section>
        </div>
        <div className="mt-6 flex justify-end"><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#2ecc71] px-5 py-3 font-bold text-slate-950 disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={17} /> : saved ? <CheckCircle2 size={17} /> : <Save size={17} />}{saving ? "Saving…" : saved ? "Saved" : "Save commercial document settings"}</button></div>
      </main>
    </div>
  );
}
