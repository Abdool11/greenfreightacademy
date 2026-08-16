"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, Loader2, Save, ShieldCheck } from "lucide-react";

interface BillingForm {
  legal_entity_name: string;
  trading_name: string;
  registration_number: string;
  vat_registered: boolean;
  vat_number: string;
  billing_address: string;
  accounts_contact_name: string;
  accounts_email: string;
  accounts_phone: string;
}

const EMPTY_FORM: BillingForm = {
  legal_entity_name: "",
  trading_name: "",
  registration_number: "",
  vat_registered: false,
  vat_number: "",
  billing_address: "",
  accounts_contact_name: "",
  accounts_email: "",
  accounts_phone: "",
};

const inputStyle = {
  width: "100%",
  padding: "0.75rem 0.875rem",
  background: "#060e1a",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "0.625rem",
  color: "#f9fafb",
  fontSize: "0.9375rem",
  outline: "none",
};

export default function BillingProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<BillingForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/company/billing-profile")
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load billing details");
        return res.json();
      })
      .then((data) => {
        if (data.profile) {
          setForm({ ...EMPTY_FORM, ...data.profile, vat_registered: Boolean(data.profile.vat_registered) });
        }
      })
      .catch(() => setError("We could not load your billing details. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  const setValue = (key: keyof BillingForm, value: string | boolean) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setSaved(false);
    setFieldErrors((previous) => ({ ...previous, [key]: "" }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      const response = await fetch("/api/company/billing-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Please check the highlighted fields.");
        setFieldErrors(data.fields || {});
        return;
      }
      setSaved(true);
      const returnTo = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("returnTo") : null;
      if (returnTo === "/dashboard") {
        setTimeout(() => router.push("/dashboard"), 700);
      } else {
        setTimeout(() => setSaved(false), 3500);
      }
    } catch {
      setError("Unable to save your billing details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const label = (text: string, required = false) => (
    <label style={{ display: "block", marginBottom: "0.4rem", color: "#cbd5e1", fontSize: "0.8125rem", fontWeight: 700 }}>
      {text}{required && <span style={{ color: "#22c55e" }}> *</span>}
    </label>
  );

  const errorFor = (key: string) => fieldErrors[key] ? (
    <p style={{ margin: "0.35rem 0 0", color: "#f87171", fontSize: "0.75rem" }}>{fieldErrors[key]}</p>
  ) : null;

  if (loading) {
    return <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", background: "#08101e" }}><Loader2 className="animate-spin" color="#22c55e" /></div>;
  }

  return (
    <div style={{ minHeight: "100vh", paddingTop: "5rem", background: "#08101e" }}>
      <section style={{ padding: "3rem 0 2.25rem", background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="container-gfa" style={{ maxWidth: "900px" }}>
          <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "#94a3b8", fontSize: "0.875rem", textDecoration: "none", marginBottom: "1.25rem" }}><ArrowLeft size={14} /> Back to dashboard</Link>
          <div style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
            <div style={{ width: "44px", height: "44px", display: "grid", placeItems: "center", borderRadius: "0.75rem", background: "rgba(34,197,94,0.12)", color: "#22c55e" }}><Building2 size={22} /></div>
            <div>
              <span className="pill-badge pill-green" style={{ display: "inline-flex", marginBottom: "0.625rem" }}>Account setup</span>
              <h1 style={{ fontSize: "1.875rem", margin: 0 }}>Billing Profile</h1>
              <p style={{ color: "#aab7c9", margin: "0.625rem 0 0", maxWidth: "620px", lineHeight: 1.6 }}>These details appear on formal training quotations sent to your accounts team. Complete them once and keep them up to date.</p>
            </div>
          </div>
        </div>
      </section>

      <main className="container-gfa" style={{ maxWidth: "900px", paddingTop: "2.25rem", paddingBottom: "4rem" }}>
        {error && <div style={{ marginBottom: "1.25rem", padding: "0.875rem 1rem", borderRadius: "0.75rem", color: "#fecaca", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>{error}</div>}

        <div style={{ display: "grid", gap: "1.25rem" }}>
          <section style={{ padding: "1.5rem", background: "#0d1520", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1rem" }}>
            <h2 style={{ margin: "0 0 0.25rem", color: "#f8fafc", fontSize: "1.1rem" }}>Purchasing entity</h2>
            <p style={{ margin: "0 0 1.25rem", color: "#94a3b8", fontSize: "0.875rem" }}>The legal organisation that will receive and pay the quotation.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
              <div>{label("Legal entity name", true)}<input style={inputStyle} value={form.legal_entity_name} onChange={(e) => setValue("legal_entity_name", e.target.value)} placeholder="e.g. Acme Freight (Pty) Ltd" />{errorFor("legal_entity_name")}</div>
              <div>{label("Trading name")}<input style={inputStyle} value={form.trading_name} onChange={(e) => setValue("trading_name", e.target.value)} placeholder="If different from legal entity" /></div>
              <div>{label("Company registration number")}<input style={inputStyle} value={form.registration_number} onChange={(e) => setValue("registration_number", e.target.value)} placeholder="Optional" /></div>
              <div style={{ paddingTop: "1.75rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", color: "#cbd5e1", fontSize: "0.875rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.vat_registered} onChange={(e) => setValue("vat_registered", e.target.checked)} /> VAT registered
                </label>
              </div>
              {form.vat_registered && <div>{label("VAT number", true)}<input style={inputStyle} value={form.vat_number} onChange={(e) => setValue("vat_number", e.target.value)} />{errorFor("vat_number")}</div>}
            </div>
            <div style={{ marginTop: "1rem" }}>{label("Billing address", true)}<textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={form.billing_address} onChange={(e) => setValue("billing_address", e.target.value)} placeholder={"Street address\nSuburb, city\nPostal code"} />{errorFor("billing_address")}</div>
          </section>

          <section style={{ padding: "1.5rem", background: "#0d1520", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1rem" }}>
            <h2 style={{ margin: "0 0 0.25rem", color: "#f8fafc", fontSize: "1.1rem" }}>Accounts-payable contact</h2>
            <p style={{ margin: "0 0 1.25rem", color: "#94a3b8", fontSize: "0.875rem" }}>We will send your formal quotation to this contact as well as to your platform account email.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
              <div>{label("Contact name", true)}<input style={inputStyle} value={form.accounts_contact_name} onChange={(e) => setValue("accounts_contact_name", e.target.value)} />{errorFor("accounts_contact_name")}</div>
              <div>{label("Accounts email", true)}<input type="email" style={inputStyle} value={form.accounts_email} onChange={(e) => setValue("accounts_email", e.target.value)} placeholder="accounts@company.co.za" />{errorFor("accounts_email")}</div>
              <div>{label("Accounts phone")}<input style={inputStyle} value={form.accounts_phone} onChange={(e) => setValue("accounts_phone", e.target.value)} placeholder="Optional" /></div>
            </div>
          </section>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 1.25rem", borderRadius: "0.875rem", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)", color: "#bbf7d0", fontSize: "0.875rem" }}><ShieldCheck size={18} /> Your billing details are saved securely and copied into each issued quote so historic documents remain accurate.</div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <Link href="/dashboard" style={{ padding: "0.8rem 1.1rem", color: "#cbd5e1", textDecoration: "none", fontWeight: 700 }}>Cancel</Link>
            <button onClick={save} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", border: 0, borderRadius: "0.75rem", padding: "0.8rem 1.25rem", background: saved ? "rgba(34,197,94,0.15)" : "#22c55e", color: saved ? "#86efac" : "#04120a", fontWeight: 800, cursor: saving ? "wait" : "pointer" }}>
              {saving ? <Loader2 className="animate-spin" size={17} /> : saved ? <CheckCircle2 size={17} /> : <Save size={17} />}
              {saving ? "Saving…" : saved ? "Billing profile saved" : "Save billing profile"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
