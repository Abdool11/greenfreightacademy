"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Upload, Download, Plus, Send, CheckSquare, Square, Search, Filter, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

type Stage = "imported" | "voucher_sent" | "activated" | "drivers_deployed" | "converted" | "lost";

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  notes?: string;
  stage: Stage;
  source?: string;
  created_at: string;
  last_activity_at?: string;
  voucher_id?: string;
  company_id?: string;
  trial_vouchers?: { code: string; seats: number; status: string; activated_at?: string };
  companies?: { id: string; name: string; account_type: string };
}

const STAGE_LABELS: Record<Stage, string> = {
  imported: "Imported",
  voucher_sent: "Voucher Sent",
  activated: "Activated",
  drivers_deployed: "Drivers Deployed",
  converted: "Converted",
  lost: "Lost",
};

const STAGE_COLORS: Record<Stage, string> = {
  imported: "#6b7280",
  voucher_sent: "#3b82f6",
  activated: "#22c55e",
  drivers_deployed: "#f59e0b",
  converted: "#8b5cf6",
  lost: "#f87171",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "">("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Campaign modal
  const [showCampaign, setShowCampaign] = useState(false);
  const [campaignSeats, setCampaignSeats] = useState<number>(5);
  const [campaignDays, setCampaignDays] = useState<number>(30);
  const [campaignWelcome, setCampaignWelcome] = useState("");
  const [campaignBrochure, setCampaignBrochure] = useState("");
  const [campaignSendVia, setCampaignSendVia] = useState("both");
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [campaignResult, setCampaignResult] = useState<{ sent: number; failed: number } | null>(null);

  useEffect(() => { fetchLeads(); }, [search, stageFilter]);

  async function fetchLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (stageFilter) params.set("stage", stageFilter);
      const res = await fetch(`/api/admin/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/leads", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setImportResult({ ok: true, message: `${data.imported} lead${data.imported !== 1 ? "s" : ""} imported successfully.` });
        fetchLeads();
      } else {
        setImportResult({ ok: false, message: data.error ?? "Import failed" });
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSendCampaign() {
    setSendingCampaign(true);
    setCampaignResult(null);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: Array.from(selected),
          seats: campaignSeats,
          expiresDays: campaignDays,
          welcomeMessage: campaignWelcome,
          brochureUrl: campaignBrochure,
          sendVia: campaignSendVia,
        }),
      });
      const data = await res.json();
      setCampaignResult({ sent: data.sent, failed: data.failed });
      setSelected(new Set());
      fetchLeads();
    } finally {
      setSendingCampaign(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l) => l.id)));
    }
  }

  const cardStyle: React.CSSProperties = { background: "#0a1628", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.875rem" };
  const inputStyle: React.CSSProperties = { padding: "0.625rem 0.875rem", background: "#060e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#f9fafb", fontSize: "0.875rem" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#9ca3af", marginBottom: "0.25rem" };

  // Funnel counts
  const stageCounts = Object.keys(STAGE_LABELS).reduce((acc, s) => {
    acc[s as Stage] = leads.filter((l) => l.stage === s).length;
    return acc;
  }, {} as Record<Stage, number>);

  return (
    <div style={{ minHeight: "100vh", background: "#060e1a", color: "#f9fafb", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <Link href="/admin/dashboard" style={{ color: "#6b7280", textDecoration: "none", fontSize: "0.875rem" }}>Admin</Link>
              <span style={{ color: "#4b5563" }}>/</span>
              <span style={{ color: "#f9fafb", fontSize: "0.875rem" }}>Leads & Campaigns</span>
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Leads & Campaigns</h1>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <a href="/api/admin/leads/template" download style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5625rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#9ca3af", textDecoration: "none", fontSize: "0.8125rem", fontWeight: 600 }}>
              <Download size={13} /> Download template
            </a>
            <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5625rem 1rem", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "0.5rem", color: "#60a5fa", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}>
              <Upload size={13} /> {importing ? "Importing…" : "Import Excel"}
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: "none" }} />
            </label>
            {selected.size > 0 && (
              <button
                onClick={() => setShowCampaign(true)}
                style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5625rem 1rem", background: "#22c55e", border: "none", borderRadius: "0.5rem", color: "#000", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}
              >
                <Send size={13} /> Send campaign ({selected.size})
              </button>
            )}
          </div>
        </div>

        {/* Import result */}
        {importResult && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", background: importResult.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${importResult.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: "0.625rem", marginBottom: "1rem", color: importResult.ok ? "#22c55e" : "#f87171", fontSize: "0.875rem" }}>
            {importResult.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {importResult.message}
          </div>
        )}

        {/* Funnel strip */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
          {(Object.keys(STAGE_LABELS) as Stage[]).map((stage) => (
            <button
              key={stage}
              onClick={() => setStageFilter(stageFilter === stage ? "" : stage)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0.625rem 1rem", background: stageFilter === stage ? `${STAGE_COLORS[stage]}20` : "#0a1628", border: `1px solid ${stageFilter === stage ? STAGE_COLORS[stage] : "rgba(255,255,255,0.06)"}`, borderRadius: "0.625rem", cursor: "pointer", minWidth: "90px", flexShrink: 0 }}
            >
              <span style={{ fontSize: "1.25rem", fontWeight: 700, color: STAGE_COLORS[stage] }}>{stageCounts[stage]}</span>
              <span style={{ fontSize: "0.6875rem", color: "#6b7280", textAlign: "center", marginTop: "0.125rem" }}>{STAGE_LABELS[stage]}</span>
            </button>
          ))}
        </div>

        {/* Search + filter */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
            <input
              style={{ ...inputStyle, paddingLeft: "2.25rem", width: "100%", boxSizing: "border-box" }}
              placeholder="Search company, contact, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={fetchLeads} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.625rem 0.875rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#9ca3af", cursor: "pointer", fontSize: "0.8125rem" }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Select all bar */}
        {leads.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", background: "#0a1628", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.5rem 0.5rem 0 0", borderBottom: "none" }}>
            <button onClick={toggleSelectAll} style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.8125rem" }}>
              {selected.size === leads.length ? <CheckSquare size={14} style={{ color: "#22c55e" }} /> : <Square size={14} />}
              {selected.size === leads.length ? "Deselect all" : "Select all"}
            </button>
            {selected.size > 0 && (
              <span style={{ fontSize: "0.8125rem", color: "#6b7280" }}>{selected.size} selected</span>
            )}
          </div>
        )}

        {/* Leads table */}
        <div style={{ ...cardStyle, borderRadius: leads.length > 0 ? "0 0 0.875rem 0.875rem" : "0.875rem", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>Loading leads…</div>
          ) : leads.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>👥</div>
              <div style={{ fontWeight: 600, marginBottom: "0.375rem" }}>No leads yet</div>
              <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>Import an Excel file or add leads manually to get started.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: 600, width: "32px" }}></th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>Company</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>Contact</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>Stage</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>Voucher</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>Added</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: selected.has(lead.id) ? "rgba(34,197,94,0.04)" : "transparent" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <button onClick={() => toggleSelect(lead.id)} style={{ background: "none", border: "none", cursor: "pointer", color: selected.has(lead.id) ? "#22c55e" : "#4b5563", display: "flex" }}>
                        {selected.has(lead.id) ? <CheckSquare size={15} /> : <Square size={15} />}
                      </button>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#f9fafb" }}>{lead.company_name || "—"}</div>
                      {lead.notes && <div style={{ fontSize: "0.75rem", color: "#4b5563", marginTop: "0.125rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.notes}</div>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ fontSize: "0.875rem", color: "#d1d5db" }}>{lead.contact_name || "—"}</div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{lead.email}</div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.1875rem 0.5rem", borderRadius: "1rem", background: `${STAGE_COLORS[lead.stage]}20`, color: STAGE_COLORS[lead.stage] }}>
                        {STAGE_LABELS[lead.stage]}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {lead.trial_vouchers ? (
                        <div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#f9fafb", fontFamily: "monospace" }}>{lead.trial_vouchers.code}</div>
                          <div style={{ fontSize: "0.6875rem", color: "#6b7280" }}>{lead.trial_vouchers.seats} seats</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#4b5563" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "#6b7280" }}>
                      {new Date(lead.created_at).toLocaleDateString("en-ZA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Campaign modal */}
        {showCampaign && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "1rem" }}>
            <div style={{ background: "#0a1628", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1.25rem", padding: "2rem", maxWidth: "480px", width: "100%", maxHeight: "90vh", overflowY: "auto", color: "#f9fafb" }}>
              {campaignResult ? (
                <div style={{ textAlign: "center", padding: "1rem" }}>
                  <CheckCircle2 size={40} style={{ color: "#22c55e", margin: "0 auto 1rem", display: "block" }} />
                  <h2 style={{ margin: "0 0 0.5rem" }}>Campaign sent!</h2>
                  <p style={{ color: "#9ca3af", margin: "0 0 0.25rem" }}><strong style={{ color: "#22c55e" }}>{campaignResult.sent}</strong> vouchers sent successfully</p>
                  {campaignResult.failed > 0 && <p style={{ color: "#f87171", margin: "0 0 1.5rem", fontSize: "0.875rem" }}>{campaignResult.failed} failed — check WhatsApp/email config</p>}
                  <button onClick={() => { setShowCampaign(false); setCampaignResult(null); }} style={{ padding: "0.75rem 1.5rem", background: "#22c55e", border: "none", borderRadius: "0.5rem", color: "#000", fontWeight: 700, cursor: "pointer" }}>Done</button>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                    <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700 }}>Send campaign to {selected.size} lead{selected.size !== 1 ? "s" : ""}</h2>
                    <button onClick={() => setShowCampaign(false)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "1.25rem" }}>×</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <label style={labelStyle}>Seats per voucher</label>
                        <select value={campaignSeats} onChange={(e) => setCampaignSeats(Number(e.target.value))} style={{ ...inputStyle, width: "100%" }}>
                          {[1, 3, 5, 10].map((n) => <option key={n} value={n}>{n} seat{n > 1 ? "s" : ""}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Trial duration</label>
                        <select value={campaignDays} onChange={(e) => setCampaignDays(Number(e.target.value))} style={{ ...inputStyle, width: "100%" }}>
                          <option value={14}>14 days</option>
                          <option value={30}>30 days</option>
                          <option value={60}>60 days</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Welcome message</label>
                      <textarea style={{ ...inputStyle, width: "100%", minHeight: "80px", resize: "vertical", boxSizing: "border-box" }} value={campaignWelcome} onChange={(e) => setCampaignWelcome(e.target.value)} placeholder="Message shown on activation page and in the invitation…" />
                    </div>
                    <div>
                      <label style={labelStyle}>Brochure URL (optional)</label>
                      <input style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} value={campaignBrochure} onChange={(e) => setCampaignBrochure(e.target.value)} placeholder="https://... (PDF link)" />
                    </div>
                    <div>
                      <label style={labelStyle}>Send via</label>
                      <select value={campaignSendVia} onChange={(e) => setCampaignSendVia(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
                        <option value="both">WhatsApp + Email</option>
                        <option value="email">Email only</option>
                        <option value="whatsapp">WhatsApp only</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem" }}>
                      <button onClick={() => setShowCampaign(false)} style={{ flex: 1, padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#9ca3af", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                      <button onClick={handleSendCampaign} disabled={sendingCampaign} style={{ flex: 2, padding: "0.75rem", background: "#22c55e", border: "none", borderRadius: "0.5rem", color: "#000", fontWeight: 700, cursor: sendingCampaign ? "default" : "pointer", opacity: sendingCampaign ? 0.7 : 1 }}>
                        {sendingCampaign ? "Sending…" : `Send to ${selected.size} lead${selected.size !== 1 ? "s" : ""}`}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
