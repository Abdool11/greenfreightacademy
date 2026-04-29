"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { Save, Loader2, CheckCircle2, RefreshCw, ToggleLeft, ToggleRight, Mail } from "lucide-react";

type Mode = "static" | "live";

interface StatRow {
  key: string;
  label: string;
  description: string;
  modeKey: string;
  staticKey: string;
  defaultStatic: number;
}

const STATS: StatRow[] = [
  {
    key: "companies",
    label: "Companies",
    description: "Number of companies displayed on bragging strips across all three sites.",
    modeKey: "stats_companies_mode",
    staticKey: "stats_companies_static",
    defaultStatic: 7,
  },
  {
    key: "drivers",
    label: "Training Seats Booked",
    description: "Total training seats booked — displayed on GFA, TAG, and BD bragging strips.",
    modeKey: "stats_drivers_mode",
    staticKey: "stats_drivers_static",
    defaultStatic: 252,
  },
  {
    key: "certificates",
    label: "Certifications Completed",
    description: "Total certifications issued — displayed on GFA, TAG, and BD bragging strips.",
    modeKey: "stats_certificates_mode",
    staticKey: "stats_certificates_static",
    defaultStatic: 207,
  },
  {
    key: "workshops",
    label: "Workshops Delivered",
    description: "Number of workshops delivered — displayed on the TAG bragging strip.",
    modeKey: "stats_workshops_mode",
    staticKey: "stats_workshops_static",
    defaultStatic: 34,
  },
];

export default function AdminStatsPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        setConfig(d.config ?? {});
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load settings.");
        setLoading(false);
      });
  }, []);

  const getMode = (stat: StatRow): Mode =>
    (config[stat.modeKey] as Mode) || "static";

  const getStatic = (stat: StatRow): number =>
    parseInt(config[stat.staticKey] ?? String(stat.defaultStatic), 10) || stat.defaultStatic;

  const setMode = (stat: StatRow, mode: Mode) => {
    setConfig((prev) => ({ ...prev, [stat.modeKey]: mode }));
    setSaved(false);
  };

  const setStaticVal = (stat: StatRow, val: string) => {
    setConfig((prev) => ({ ...prev, [stat.staticKey]: val }));
    setSaved(false);
  };

  const setContactEmail = (val: string) => {
    setConfig((prev) => ({ ...prev, contact_email: val }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "#22c55e" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ color: "#f9fafb", fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.375rem" }}>
          Impact Stats &amp; Contact Settings
        </h1>
        <p style={{ color: "#9ca3af", fontSize: "0.9375rem" }}>
          Control the numbers shown on the bragging strips across GFA, TAG, and BetterDriver.
          Each stat can display a manually set number or pull live data from the database.
          Changes here are reflected on all three sites.
        </p>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.75rem", padding: "0.875rem 1rem", marginBottom: "1.5rem", color: "#f87171", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2rem" }}>
        {STATS.map((stat) => {
          const mode = getMode(stat);
          const staticVal = getStatic(stat);
          return (
            <div
              key={stat.key}
              style={{
                background: "#0d1b2e",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "1rem",
                padding: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ color: "#f9fafb", fontSize: "1rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    {stat.label}
                  </h3>
                  <p style={{ color: "#6b7280", fontSize: "0.8125rem", lineHeight: 1.5 }}>
                    {stat.description}
                  </p>
                </div>
                {/* Mode toggle */}
                <button
                  onClick={() => setMode(stat, mode === "static" ? "live" : "static")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.375rem 0.875rem",
                    background: mode === "live" ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${mode === "live" ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: "2rem",
                    color: mode === "live" ? "#22c55e" : "#9ca3af",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {mode === "live" ? (
                    <><RefreshCw size={12} /> Live DB</>
                  ) : (
                    <><ToggleLeft size={14} /> Static</>
                  )}
                </button>
              </div>

              {mode === "static" ? (
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#9ca3af", marginBottom: "0.375rem" }}>
                    Static value displayed on site
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={staticVal}
                    onChange={(e) => setStaticVal(stat, e.target.value)}
                    style={{
                      width: "160px",
                      padding: "0.625rem 0.875rem",
                      background: "#060e1a",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "0.5rem",
                      color: "#f9fafb",
                      fontSize: "1.125rem",
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.625rem 0.875rem",
                    background: "rgba(34,197,94,0.06)",
                    border: "1px solid rgba(34,197,94,0.15)",
                    borderRadius: "0.5rem",
                    color: "#22c55e",
                    fontSize: "0.875rem",
                  }}
                >
                  <RefreshCw size={14} />
                  Displaying live count from database
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Contact Email */}
      <div
        style={{
          background: "#0d1b2e",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "1rem",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem" }}>
          <Mail size={18} color="#60a5fa" />
          <h3 style={{ color: "#f9fafb", fontSize: "1rem", fontWeight: 700, margin: 0 }}>
            Contact Email
          </h3>
        </div>
        <p style={{ color: "#6b7280", fontSize: "0.8125rem", marginBottom: "1rem" }}>
          The contact email address used on all Contact Us forms across GFA, TAG, and BetterDriver.
        </p>
        <input
          type="email"
          value={config.contact_email ?? "durbanroadtransport@gmail.com"}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="durbanroadtransport@gmail.com"
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "0.625rem 0.875rem",
            background: "#060e1a",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "0.5rem",
            color: "#f9fafb",
            fontSize: "0.9375rem",
            outline: "none",
          }}
        />
      </div>

      {/* Save button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1.75rem",
            background: saved ? "rgba(34,197,94,0.15)" : "#22c55e",
            border: "none",
            borderRadius: "0.75rem",
            color: saved ? "#22c55e" : "#000",
            fontWeight: 700,
            fontSize: "0.9375rem",
            cursor: saving || saved ? "default" : "pointer",
          }}
        >
          {saving ? (
            <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
          ) : saved ? (
            <><CheckCircle2 size={16} /> Saved</>
          ) : (
            <><Save size={16} /> Save all settings</>
          )}
        </button>
      </div>
    </div>
  );
}
