"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Copy, CheckCircle2, Clock, AlertTriangle, RefreshCw, ArrowUpRight } from "lucide-react";

interface Voucher {
  id: string;
  code: string;
  seats: number;
  expires_days: number;
  welcome_message?: string;
  brochure_url?: string;
  status: "pending" | "sent" | "activated" | "converted" | "expired";
  created_at: string;
  sent_at?: string;
  activated_at?: string;
  prospect_name?: string;
  prospect_email?: string;
  prospect_phone?: string;
  prospect_company?: string;
  created_by_name?: string;
  companies?: { id: string; name: string; account_type: string };
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#6b7280",
  sent: "#3b82f6",
  activated: "#22c55e",
  converted: "#8b5cf6",
  expired: "#f87171",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  sent: "Sent",
  activated: "Activated",
  converted: "Converted",
  expired: "Expired",
};

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form state
  const [seats, setSeats] = useState<number>(5);
  const [expiresDays, setExpiresDays] = useState<number>(30);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [brochureUrl, setBrochureUrl] = useState("");
  const [prospectName, setProspectName] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [prospectPhone, setProspectPhone] = useState("");
  const [prospectCompany, setProspectCompany] = useState("");
  const [sendVia, setSendVia] = useState("both");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [lastCreated, setLastCreated] = useState<{ code: string; url: string } | null>(null);

  useEffect(() => { fetchVouchers(); }, []);

  async function fetchVouchers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vouchers");
      const data = await res.json();
      setVouchers(data.vouchers ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seats, expiresDays, welcomeMessage, brochureUrl, notes, prospectName, prospectEmail, prospectPhone, prospectCompany, sendVia }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error ?? "Failed to create voucher"); return; }
      setLastCreated({ code: data.voucher.code, url: data.voucher.activation_url });
      setShowCreate(false);
      fetchVouchers();
      // Reset form
      setSeats(5); setExpiresDays(30); setWelcomeMessage(""); setBrochureUrl("");
      setProspectName(""); setProspectEmail(""); setProspectPhone(""); setProspectCompany(""); setNotes("");
    } finally {
      setCreating(false);
    }
  }

  async function handleConvert(voucherId: string) {
    if (!confirm("Convert this trial to a full account? This removes seat and time limits.")) return;
    await fetch("/api/admin/vouchers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voucherId, action: "convert_to_full" }),
    });
    fetchVouchers();
  }

  function copyToClipboard(text: string, code: string) {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const cardStyle: React.CSSProperties = { background: "#0a1628", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.875rem", padding: "1.5rem" };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "0.625rem 0.875rem", background: "#060e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#f9fafb", fontSize: "0.875rem", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", marginBottom: "0.25rem" };

  return (
    <div style={{ minHeight: "100vh", background: "#060e1a", color: "#f9fafb", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <Link href="/admin/dashboard" style={{ color: "#6b7280", textDecoration: "none", fontSize: "0.875rem" }}>Admin</Link>
              <span style={{ color: "#4b5563" }}>/</span>
              <span style={{ color: "#f9fafb", fontSize: "0.875rem" }}>Trial Vouchers</span>
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Trial Vouchers</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem 1.125rem", background: "#22c55e", border: "none", borderRadius: "0.625rem", color: "#000", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}
          >
            <Plus size={15} /> Create voucher
          </button>
        </div>

        {/* Last created success banner */}
        {lastCreated && (
          <div style={{ ...cardStyle, border: "1px solid rgba(34,197,94,0.3)", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <CheckCircle2 size={18} style={{ color: "#22c55e", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, color: "#22c55e", fontSize: "0.9375rem" }}>Voucher created: {lastCreated.code}</div>
                <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.125rem", wordBreak: "break-all" }}>{lastCreated.url}</div>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(lastCreated.url, lastCreated.code)}
              style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "0.5rem", color: "#22c55e", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", flexShrink: 0 }}
            >
              {copiedCode === lastCreated.code ? <><CheckCircle2 size={13} /> Copied!</> : <><Copy size={13} /> Copy link</>}
            </button>
          </div>
        )}

        {/* Create voucher modal */}
        {showCreate && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
            <div style={{ ...cardStyle, maxWidth: "520px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>Create trial voucher</h2>
                <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "1.25rem" }}>×</button>
              </div>
              <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={labelStyle}>Seats *</label>
                    <select value={seats} onChange={(e) => setSeats(Number(e.target.value))} style={inputStyle} required>
                      {[1, 3, 5, 10].map((n) => <option key={n} value={n}>{n} seat{n > 1 ? "s" : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Trial duration *</label>
                    <select value={expiresDays} onChange={(e) => setExpiresDays(Number(e.target.value))} style={inputStyle} required>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Prospect company</label>
                  <input style={inputStyle} value={prospectCompany} onChange={(e) => setProspectCompany(e.target.value)} placeholder="Company name" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={labelStyle}>Contact name</label>
                    <input style={inputStyle} value={prospectName} onChange={(e) => setProspectName(e.target.value)} placeholder="Full name" />
                  </div>
                  <div>
                    <label style={labelStyle}>Mobile number</label>
                    <input style={inputStyle} value={prospectPhone} onChange={(e) => setProspectPhone(e.target.value)} placeholder="+27 xx xxx xxxx" />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Email address</label>
                  <input style={inputStyle} type="email" value={prospectEmail} onChange={(e) => setProspectEmail(e.target.value)} placeholder="contact@company.co.za" />
                </div>
                <div>
                  <label style={labelStyle}>Welcome message</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="Personalised message shown on the activation page and in the invitation email…"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Training brochure URL (optional)</label>
                  <input style={inputStyle} value={brochureUrl} onChange={(e) => setBrochureUrl(e.target.value)} placeholder="https://... (link to PDF brochure)" />
                </div>
                <div>
                  <label style={labelStyle}>Internal notes</label>
                  <input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Met at Transport Forum 2025" />
                </div>
                <div>
                  <label style={labelStyle}>Send via</label>
                  <select value={sendVia} onChange={(e) => setSendVia(e.target.value)} style={inputStyle}>
                    <option value="both">WhatsApp + Email</option>
                    <option value="email">Email only</option>
                    <option value="whatsapp">WhatsApp only</option>
                    <option value="none">Don&apos;t send — copy link manually</option>
                  </select>
                </div>
                {createError && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.625rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.5rem", color: "#f87171", fontSize: "0.875rem" }}>
                    <AlertTriangle size={13} /> {createError}
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
                  <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#9ca3af", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                  <button type="submit" disabled={creating} style={{ flex: 2, padding: "0.75rem", background: "#22c55e", border: "none", borderRadius: "0.5rem", color: "#000", fontWeight: 700, cursor: creating ? "default" : "pointer", opacity: creating ? 0.7 : 1 }}>
                    {creating ? "Creating…" : "Create & send voucher"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Vouchers list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>Loading vouchers…</div>
        ) : vouchers.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🎟️</div>
            <div style={{ fontWeight: 600, marginBottom: "0.375rem" }}>No vouchers yet</div>
            <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>Create your first trial voucher to invite a prospect.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {vouchers.map((v) => {
              const activationUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/trial?code=${v.code}`;
              return (
                <div key={v.id} style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.375rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.9375rem", letterSpacing: "0.025em", color: "#f9fafb" }}>{v.code}</span>
                        <span style={{ fontSize: "0.6875rem", fontWeight: 700, padding: "0.125rem 0.5rem", borderRadius: "1rem", background: `${STATUS_COLORS[v.status]}20`, color: STATUS_COLORS[v.status] }}>
                          {STATUS_LABELS[v.status]}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{v.seats} seat{v.seats > 1 ? "s" : ""}</span>
                      </div>
                      {v.prospect_company && (
                        <div style={{ fontSize: "0.875rem", color: "#d1d5db", marginBottom: "0.125rem" }}>{v.prospect_company}</div>
                      )}
                      {v.prospect_name && (
                        <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>{v.prospect_name}{v.prospect_email ? ` · ${v.prospect_email}` : ""}</div>
                      )}
                      {v.welcome_message && (
                        <div style={{ fontSize: "0.75rem", color: "#4b5563", marginTop: "0.375rem", fontStyle: "italic", maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          "{v.welcome_message}"
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                      <button
                        onClick={() => copyToClipboard(activationUrl, v.code)}
                        style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.4375rem 0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#9ca3af", fontSize: "0.8125rem", cursor: "pointer" }}
                      >
                        {copiedCode === v.code ? <><CheckCircle2 size={12} style={{ color: "#22c55e" }} /> Copied</> : <><Copy size={12} /> Copy link</>}
                      </button>
                      {v.status === "activated" && (
                        <button
                          onClick={() => handleConvert(v.id)}
                          style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.4375rem 0.75rem", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "0.5rem", color: "#a78bfa", fontSize: "0.8125rem", cursor: "pointer" }}
                        >
                          <ArrowUpRight size={12} /> Convert to full
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: "0.75rem", color: "#4b5563", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Clock size={11} /> Created {new Date(v.created_at).toLocaleDateString("en-ZA")}
                    </div>
                    {v.activated_at && (
                      <div style={{ fontSize: "0.75rem", color: "#22c55e", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <CheckCircle2 size={11} /> Activated {new Date(v.activated_at).toLocaleDateString("en-ZA")}
                      </div>
                    )}
                    {v.companies && (
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        Account: {v.companies.name}
                      </div>
                    )}
                    <div style={{ fontSize: "0.75rem", color: "#4b5563" }}>By {v.created_by_name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
