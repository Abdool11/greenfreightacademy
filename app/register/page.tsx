"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Building2, Mail, Lock, Phone, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({ companyName: "", contactName: "", email: "", phone: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: form.companyName, contactName: form.contactName, email: form.email, phone: form.phone, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed."); return; }
      // Keep the session cookie created by the API, but let the user explicitly
      // acknowledge success before entering the dashboard.
      try { localStorage.removeItem("gfa_walkthrough_done"); } catch { /* ignore */ }
      setRegistered(true);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const field = (label: string, key: string, type: string, placeholder: string, Icon: React.ElementType) => (
    <div>
      <label style={{ display: "block", color: "#9ca3af", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.5rem" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <Icon size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#4b5563" }} />
        <input type={type} value={(form as Record<string,string>)[key]} onChange={set(key)} required placeholder={placeholder}
          style={{ width: "100%", background: "#0a1120", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.625rem", padding: "0.75rem 0.875rem 0.75rem 2.5rem", color: "#f9fafb", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box" }} />
      </div>
    </div>
  );

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <section style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1.5rem", background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)" }}>
        <div style={{ width: "100%", maxWidth: "640px", textAlign: "center" }}>
          <span className="pill-badge pill-green" style={{ marginBottom: "1.5rem", display: "inline-flex" }}>Company Registration</span>
          <h1 style={{ marginBottom: "0.75rem" }}>Register your company</h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2.5rem" }}>Create a company account to manage driver training, track progress, and deploy learning at scale.</p>
          <form onSubmit={handleSubmit} style={{ background: "#0d1520", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1rem", padding: "2rem", textAlign: "left" }}>
            {registered ? (
              <div style={{ textAlign: "center", padding: "1rem 0 0.5rem" }}>
                <CheckCircle2 size={48} style={{ color: "#22c55e", margin: "0 auto 1rem", display: "block" }} />
                <h2 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Your company account is ready</h2>
                <p style={{ color: "#cbd5e1", margin: "0 auto 1.5rem", maxWidth: "440px" }}>Continue to your dashboard to add drivers, prepare a quotation and begin your onboarding journey.</p>
                <a href="/dashboard?welcome=1" className="btn-primary" style={{ justifyContent: "center", width: "100%" }}>Continue to dashboard <ArrowRight size={16} /></a>
              </div>
            ) : <>
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.625rem", padding: "0.75rem 1rem", marginBottom: "1.25rem", color: "#f87171", fontSize: "0.875rem" }}>
                <AlertCircle size={16} />{error}
              </div>
            )}
            <div className="auth-form-grid">
              {field("Company name", "companyName", "text", "Your company name", Building2)}
              {field("Your name", "contactName", "text", "Contact person name", Building2)}
              {field("Work email", "email", "email", "you@company.co.za", Mail)}
              {field("Phone number", "phone", "tel", "+27 xx xxx xxxx", Phone)}
              {field("Password", "password", "password", "Min. 8 characters", Lock)}
              {field("Confirm password", "confirm", "password", "Repeat password", Lock)}
            </div>
            <button type="submit" disabled={loading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "#22c55e", color: "#000", border: "none", borderRadius: "0.625rem", padding: "0.875rem", fontWeight: 700, fontSize: "0.9375rem", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginTop: "1.5rem" }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Creating account..." : "Create company account"}
            </button>
            <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.875rem", marginTop: "1.25rem" }}>
              Already have an account?{" "}<Link href="/login" style={{ color: "#22c55e", fontWeight: 600 }}>Log in</Link>
            </p>
            </>}
          </form>
        </div>
      </section>
    </div>
  );
}
