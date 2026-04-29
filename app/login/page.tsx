"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      window.location.href = "/dashboard";
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      <section style={{ padding: "5rem 0 4rem", background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container-gfa">
          <span className="pill-badge pill-green" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>Company Login</span>
          <h1 style={{ maxWidth: "600px", marginBottom: "1rem" }}>Log in to your company account</h1>
          <p style={{ maxWidth: "520px", color: "var(--text-secondary)" }}>Access your dashboard, manage driver enrolments, and track training progress.</p>
        </div>
      </section>
      <section style={{ padding: "4rem 0" }}>
        <div className="container-gfa">
          <div style={{ maxWidth: "440px" }}>
            <form onSubmit={handleSubmit} style={{ background: "#0d1520", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1rem", padding: "2rem" }}>
              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.625rem", padding: "0.75rem 1rem", marginBottom: "1.25rem", color: "#f87171", fontSize: "0.875rem" }}>
                  <AlertCircle size={16} />{error}
                </div>
              )}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", color: "#9ca3af", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.5rem" }}>Work email</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#4b5563" }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.co.za" style={{ width: "100%", background: "#0a1120", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.625rem", padding: "0.75rem 0.875rem 0.75rem 2.5rem", color: "#f9fafb", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ marginBottom: "1.75rem" }}>
                <label style={{ display: "block", color: "#9ca3af", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.5rem" }}>Password</label>
                <div style={{ position: "relative" }}>
                  <Lock size={16} style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#4b5563" }} />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Your password" style={{ width: "100%", background: "#0a1120", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.625rem", padding: "0.75rem 0.875rem 0.75rem 2.5rem", color: "#f9fafb", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "#22c55e", color: "#000", border: "none", borderRadius: "0.625rem", padding: "0.875rem", fontWeight: 700, fontSize: "0.9375rem", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? "Logging in..." : "Log in"}
              </button>
              <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.875rem", marginTop: "1.25rem" }}>
                Don&apos;t have an account?{" "}<Link href="/register" style={{ color: "#22c55e", fontWeight: 600 }}>Register your company</Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
