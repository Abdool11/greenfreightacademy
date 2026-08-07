"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Save, Send, CheckCircle2, Loader2, Bell } from "lucide-react";

interface NotifPref {
  event_key: string;
  label: string;
  description: string;
  group_name: string;
  whatsapp_1: boolean;
  whatsapp_2: boolean;
  email_1: boolean;
  email_2: boolean;
}

interface Recipients {
  admin_whatsapp_1: string;
  admin_whatsapp_2: string;
  email_booking_to: string;
  admin_email_2: string;
}

const GROUP_LABELS: Record<string, string> = {
  transactions: "Transactions & Payments",
  operations:   "Operations",
  alerts:       "Stale Pending Alerts",
  general:      "General",
};

const CHANNEL_LABELS = [
  { key: "whatsapp_1", label: "WhatsApp 1", color: "#22c55e" },
  { key: "whatsapp_2", label: "WhatsApp 2", color: "#22c55e" },
  { key: "email_1",    label: "Email 1",    color: "#3b82f6" },
  { key: "email_2",    label: "Email 2",    color: "#3b82f6" },
] as const;

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs]           = useState<NotifPref[]>([]);
  const [recipients, setRecipients] = useState<Recipients>({
    admin_whatsapp_1: "", admin_whatsapp_2: "", email_booking_to: "", admin_email_2: "",
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [testing, setTesting]   = useState<string | null>(null);
  const [testOk, setTestOk]     = useState<string | null>(null);
  const [recentLog, setRecentLog] = useState<{ event_key: string; channel: string; recipient: string; status: string; created_at: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/settings/notifications")
      .then(r => r.json())
      .then(d => {
        setPrefs(d.prefs ?? []);
        setRecipients(r => ({ ...r, ...(d.recipients ?? {}) }));
      })
      .finally(() => setLoading(false));

    // Load recent log
    fetch("/api/admin/settings/notifications/log")
      .then(r => r.json())
      .then(d => setRecentLog(d.log ?? []))
      .catch(() => {});
  }, []);

  const toggle = (eventKey: string, channel: keyof Pick<NotifPref, "whatsapp_1" | "whatsapp_2" | "email_1" | "email_2">) => {
    setPrefs(prev => prev.map(p =>
      p.event_key === eventKey ? { ...p, [channel]: !p[channel] } : p
    ));
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs, recipients }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const sendTest = async (eventKey: string) => {
    setTesting(eventKey);
    try {
      await fetch("/api/admin/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_key: eventKey }),
      });
      setTestOk(eventKey);
      setTimeout(() => setTestOk(null), 3000);
    } finally { setTesting(null); }
  };

  // Group prefs by group_name
  const groups = prefs.reduce<Record<string, NotifPref[]>>((acc, p) => {
    const g = p.group_name ?? "general";
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});

  const s = {
    page:    { paddingTop: "5rem", background: "#0a1628", minHeight: "100vh", color: "#f9fafb" } as React.CSSProperties,
    nav:     { background: "#111f3a", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.5rem" } as React.CSSProperties,
    inner:   { maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem 4rem" } as React.CSSProperties,
    card:    { background: "#0d1526", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0.875rem", padding: "1.5rem", marginBottom: "1.5rem" } as React.CSSProperties,
    label:   { display: "block", color: "#9ca3af", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.4rem" } as React.CSSProperties,
    input:   { width: "100%", background: "#0a1120", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.5rem", padding: "0.625rem 0.875rem", color: "#f9fafb", fontSize: "0.9375rem", boxSizing: "border-box" as const },
    th:      { padding: "0.625rem 0.75rem", color: "#6b7280", fontSize: "0.75rem", fontWeight: 700, textAlign: "center" as const, whiteSpace: "nowrap" as const },
    td:      { padding: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle" as const },
    toggle:  (on: boolean, color: string) => ({
      width: "36px", height: "20px", borderRadius: "9999px", border: "none", cursor: "pointer",
      background: on ? color : "rgba(255,255,255,0.1)", position: "relative" as const, transition: "background 0.2s", flexShrink: 0,
    }),
    dot: (on: boolean) => ({
      position: "absolute" as const, top: "3px", left: on ? "19px" : "3px",
      width: "14px", height: "14px", borderRadius: "50%", background: "#fff", transition: "left 0.2s",
    }),
  };

  if (loading) {
    return (
      <div style={s.page}>
        <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280" }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: "0 auto 1rem", display: "block" }} />
          Loading notification settings…
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/admin/dashboard" style={{ color: "#6b7280", fontSize: "0.875rem", textDecoration: "none" }}>← Dashboard</Link>
          <span style={{ color: "#374151" }}>/</span>
          <span style={{ color: "#f9fafb", fontSize: "0.875rem", fontWeight: 600 }}>Notification Settings</span>
        </div>
      </nav>

      <div style={s.inner}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem" }}>
              <Bell size={20} style={{ color: "#22c55e" }} />
              <h1 style={{ margin: 0, fontSize: "1.375rem", fontWeight: 700 }}>Notification Settings</h1>
            </div>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Configure which events trigger WhatsApp and email alerts to admin recipients.
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#22c55e", border: "none", borderRadius: "0.625rem", padding: "0.625rem 1.25rem", color: "#000", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* Recipients */}
        <div style={s.card}>
          <h2 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700, color: "#f9fafb" }}>Recipient Addresses</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {[
              { key: "admin_whatsapp_1", label: "WhatsApp 1 (Primary)", placeholder: "27821234567", color: "#22c55e" },
              { key: "admin_whatsapp_2", label: "WhatsApp 2 (Secondary)", placeholder: "27731234567", color: "#22c55e" },
              { key: "email_booking_to", label: "Email 1 (Primary)", placeholder: "you@example.com", color: "#3b82f6" },
              { key: "admin_email_2",    label: "Email 2 (Secondary)", placeholder: "accounts@example.com", color: "#3b82f6" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ ...s.label, color: f.color }}>{f.label}</label>
                <input
                  type="text"
                  value={(recipients as Record<string, string>)[f.key] ?? ""}
                  onChange={e => setRecipients(r => ({ ...r, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={s.input}
                />
              </div>
            ))}
          </div>
          <p style={{ margin: "0.875rem 0 0", color: "#4b5563", fontSize: "0.8125rem" }}>
            WhatsApp numbers must include country code without + (e.g. 27821234567 for +27 82 123 4567).
            Email 1 is also used for general platform notifications.
          </p>
        </div>

        {/* Notification Matrix */}
        {Object.entries(groups).map(([groupName, groupPrefs]) => (
          <div key={groupName} style={s.card}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#f9fafb" }}>
              {GROUP_LABELS[groupName] ?? groupName}
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...s.th, textAlign: "left", width: "40%" }}>Event</th>
                    {CHANNEL_LABELS.map(c => (
                      <th key={c.key} style={{ ...s.th, color: c.color }}>{c.label}</th>
                    ))}
                    <th style={s.th}>Test</th>
                  </tr>
                </thead>
                <tbody>
                  {groupPrefs.map(pref => (
                    <tr key={pref.event_key}>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#f9fafb" }}>{pref.label}</div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem" }}>{pref.description}</div>
                      </td>
                      {CHANNEL_LABELS.map(c => (
                        <td key={c.key} style={{ ...s.td, textAlign: "center" }}>
                          <button
                            onClick={() => toggle(pref.event_key, c.key as "whatsapp_1" | "whatsapp_2" | "email_1" | "email_2")}
                            style={s.toggle(pref[c.key as keyof NotifPref] as boolean, c.color)}
                            aria-label={`Toggle ${c.label} for ${pref.label}`}
                          >
                            <span style={s.dot(pref[c.key as keyof NotifPref] as boolean)} />
                          </button>
                        </td>
                      ))}
                      <td style={{ ...s.td, textAlign: "center" }}>
                        <button
                          onClick={() => sendTest(pref.event_key)}
                          disabled={testing === pref.event_key}
                          title="Send a test notification to all enabled channels"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "0.25rem",
                            background: testOk === pref.event_key ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
                            border: `1px solid ${testOk === pref.event_key ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
                            borderRadius: "0.375rem", padding: "0.3rem 0.625rem",
                            color: testOk === pref.event_key ? "#22c55e" : "#9ca3af",
                            fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          {testing === pref.event_key
                            ? <Loader2 size={12} className="animate-spin" />
                            : testOk === pref.event_key
                              ? <CheckCircle2 size={12} />
                              : <Send size={12} />}
                          {testOk === pref.event_key ? "Sent!" : "Test"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Recent notification log */}
        {recentLog.length > 0 && (
          <div style={s.card}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#f9fafb" }}>Recent Notifications Sent</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
              <thead>
                <tr>
                  {["Event", "Channel", "Recipient", "Status", "Time"].map(h => (
                    <th key={h} style={{ ...s.th, textAlign: "left", paddingLeft: "0.75rem" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLog.slice(0, 20).map(row => (
                  <tr key={row.created_at + row.channel}>
                    <td style={s.td}>{row.event_key}</td>
                    <td style={s.td}>{row.channel}</td>
                    <td style={{ ...s.td, color: "#9ca3af" }}>{row.recipient}</td>
                    <td style={s.td}>
                      <span style={{
                        padding: "0.125rem 0.5rem", borderRadius: "9999px", fontSize: "0.6875rem", fontWeight: 700,
                        background: row.status === "sent" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                        color: row.status === "sent" ? "#22c55e" : "#ef4444",
                      }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: "#6b7280" }}>
                      {new Date(row.created_at).toLocaleString("en-ZA", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
