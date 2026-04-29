"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Building2, Mail, Lock, Phone, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({ companyName: "", contactName: "", email: "", phone: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
      setSuccess(true);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  if (success) return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: "440px", padding: "2rem" }}>
        <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "50%", width: "64px", height: "64px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", color: "#22c55e" }}>
          <CheckCircle2 size={32} />
        </div>
        <h2 style={{ marginBottom: "0.75rem" }}>Account created</h2>
        <p style={{ color: "#9ca3af", marginBottom: "1.5rem" }}>Your company account has been created. You can now log in and start managing your driver training.</p>
        <Link href="/login" style={{ display: "inline-flex", alignItems: "center", background: "#22c55e", color: "#000", borderRadius: "0.625rem", padding: "0.75rem 1.5rem", fontWeight: 700, textDecoration: "none" }}>Log in to your dashboard</Link>
      </div>
    </div>
  );

  const field = (label: string, key: string, type: string, placeholder: string, Icon: React.ElementType) => (
    <div style={{ marginBottom: "1.125rem" }}>
      <label style={{ display: "block", color: "#9ca3af", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.5rem" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <Icon size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#4b5563" }} />
        <input type={type} value={(form as Record<string,string>)[key]} onChange={set(key)} required placeholder={placeholder}
          style={{ width: "100%", background: "#0a1120", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.625rem", padding: "0.75rem 0.875rem 0.75rem 2.5rem", color: "#f9fafb", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box" }} />
      </div>
    </div>
  );

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      <section style={{ padding: "5rem 0 4rem", background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container-gfa">
          <h1 style={{ maxWidth: "600px", marginBottom: "1rem" }}>Register your company</h1>
          <p style={{ maxWidth: "520px", color: "var(--text-secondary)" }}>Create a company account to manage driver training, track progress, and deploy learning at scale.</p>
        </div>
      </section>
      <section style={{ padding: "4rem 0" }}>
        <div className="container-gfa">
          <div style={{ maxWidth: "480px" }}>
            <form onSubmit={handleSubmit} style={{ background: "#0d1520", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1rem", padding: "2rem" }}>
              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.625rem", padding: "0.75rem 1rem", marginBottom: "1.25rem", color: "#f87171", fontSize: "0.875rem" }}>
                  <AlertCircle size={16} />{error}
                </div>
              )}
              {field("Company name", "companyName", "text", "Your company name", Building2)}
              {field("Your name", "contactName", "text", "Contact person name", Building2)}
              {field("Work email", "email", "email", "you@company.co.za", Mail)}
              {field("Phone number", "phone", "tel", "+27 xx xxx xxxx", Phone)}
              {field("Password", "password", "password", "Min. 8 characters", Lock)}
              {field("Confirm password", "confirm", "password", "Repeat password", Lock)}
              <button type="submit" disabled={loading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "#22c55e", color: "#000", border: "none", borderRadius: "0.625rem", padding: "0.875rem", fontWeight: 700, fontSize: "0.9375rem", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginTop: "0.5rem" }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? "Creating account..." : "Create company account"}
              </button>
              <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.875rem", marginTop: "1.25rem" }}>
                Already have an account?{" "}<Link href="/login" style={{ color: "#22c55e", fontWeight: 600 }}>Log in</Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
