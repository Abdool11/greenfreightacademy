export const dynamic = "force-dynamic";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Clock, TrendingUp, Users, CheckCircle2 } from "lucide-react";

async function getFunnelData() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    { data: leads },
    { data: campaigns },
    { data: alerts },
  ] = await Promise.all([
    supabaseAdmin
      .from("prospect_leads")
      .select(`
        id, company_name, contact_name, email, phone, stage,
        created_at, last_activity_at, notes, voucher_id, company_id,
        trial_vouchers(code, seats, status, activated_at, expires_at),
        companies(id, name, account_type)
      `)
      .order("last_activity_at", { ascending: false }),

    supabaseAdmin
      .from("campaign_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),

    // Leads needing attention
    supabaseAdmin
      .from("prospect_leads")
      .select(`
        id, company_name, contact_name, stage, last_activity_at,
        trial_vouchers(expires_at, status)
      `)
      .in("stage", ["voucher_sent", "activated"])
      .lt("last_activity_at", sevenDaysAgo.toISOString()),
  ]);

  const allLeads = leads ?? [];
  const stageCounts = {
    imported: allLeads.filter((l) => l.stage === "imported").length,
    voucher_sent: allLeads.filter((l) => l.stage === "voucher_sent").length,
    activated: allLeads.filter((l) => l.stage === "activated").length,
    drivers_deployed: allLeads.filter((l) => l.stage === "drivers_deployed").length,
    converted: allLeads.filter((l) => l.stage === "converted").length,
    lost: allLeads.filter((l) => l.stage === "lost").length,
  };

  const conversionRates = {
    importToSent: stageCounts.imported > 0 ? Math.round((stageCounts.voucher_sent / (stageCounts.imported + stageCounts.voucher_sent + stageCounts.activated + stageCounts.drivers_deployed + stageCounts.converted)) * 100) : 0,
    sentToActivated: stageCounts.voucher_sent > 0 ? Math.round((stageCounts.activated / (stageCounts.voucher_sent + stageCounts.activated + stageCounts.drivers_deployed + stageCounts.converted)) * 100) : 0,
    activatedToDeployed: stageCounts.activated > 0 ? Math.round((stageCounts.drivers_deployed / (stageCounts.activated + stageCounts.drivers_deployed + stageCounts.converted)) * 100) : 0,
    deployedToConverted: stageCounts.drivers_deployed > 0 ? Math.round((stageCounts.converted / (stageCounts.drivers_deployed + stageCounts.converted)) * 100) : 0,
  };

  return { allLeads, stageCounts, conversionRates, campaigns: campaigns ?? [], alerts: alerts ?? [] };
}

export default async function FunnelPage() {
  const session = await requireAdminSession();
  if (session instanceof Response) redirect("/admin/login");
  if (session.role !== "super_admin") redirect("/admin/dashboard");

  const { allLeads, stageCounts, conversionRates, campaigns, alerts } = await getFunnelData();

  const stages = [
    { key: "imported", label: "Imported", count: stageCounts.imported, color: "#6b7280", icon: "📥" },
    { key: "voucher_sent", label: "Voucher Sent", count: stageCounts.voucher_sent, color: "#3b82f6", icon: "📨", conv: `${conversionRates.importToSent}% sent` },
    { key: "activated", label: "Activated", count: stageCounts.activated, color: "#22c55e", icon: "✅", conv: `${conversionRates.sentToActivated}% activated` },
    { key: "drivers_deployed", label: "Drivers Deployed", count: stageCounts.drivers_deployed, color: "#f59e0b", icon: "🚛", conv: `${conversionRates.activatedToDeployed}% deployed` },
    { key: "converted", label: "Converted", count: stageCounts.converted, color: "#8b5cf6", icon: "💼", conv: `${conversionRates.deployedToConverted}% converted` },
  ];

  const cardStyle: React.CSSProperties = { background: "#0a1628", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.875rem" };

  return (
    <div style={{ minHeight: "100vh", background: "#060e1a", color: "#f9fafb", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Link href="/admin/dashboard" style={{ color: "#6b7280", textDecoration: "none", fontSize: "0.875rem" }}>Admin</Link>
            <span style={{ color: "#4b5563" }}>/</span>
            <span style={{ color: "#f9fafb", fontSize: "0.875rem" }}>Sales Funnel</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Sales Funnel Dashboard</h1>
          <p style={{ color: "#6b7280", margin: "0.25rem 0 0", fontSize: "0.875rem" }}>Lead-to-client conversion pipeline</p>
        </div>

        {/* Funnel visualisation */}
        <div style={{ ...cardStyle, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 1.25rem" }}>Conversion Pipeline</h2>
          <div style={{ display: "flex", alignItems: "stretch", gap: "0", overflowX: "auto" }}>
            {stages.map((stage, i) => {
              const maxCount = Math.max(...stages.map((s) => s.count), 1);
              const heightPct = Math.max(30, (stage.count / maxCount) * 100);
              return (
                <div key={stage.key} style={{ flex: 1, minWidth: "100px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                  {/* Arrow connector */}
                  {i > 0 && (
                    <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", color: "#374151", fontSize: "1.25rem", zIndex: 1 }}>›</div>
                  )}
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 0.25rem" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{stage.icon}</div>
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: stage.color }}>{stage.count}</div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#d1d5db", textAlign: "center", marginBottom: "0.25rem" }}>{stage.label}</div>
                    {stage.conv && (
                      <div style={{ fontSize: "0.6875rem", color: "#6b7280", textAlign: "center" }}>{stage.conv}</div>
                    )}
                    {/* Bar */}
                    <div style={{ width: "60%", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", marginTop: "0.5rem", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${heightPct}%`, background: stage.color, borderRadius: "2px" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {/* Follow-up alerts */}
          <div style={{ ...cardStyle, padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
              <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Follow-up Alerts</h2>
              {alerts.length > 0 && (
                <span style={{ background: "#f59e0b", color: "#000", fontSize: "0.6875rem", fontWeight: 700, padding: "0.125rem 0.4rem", borderRadius: "1rem" }}>{alerts.length}</span>
              )}
            </div>
            {alerts.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#22c55e", fontSize: "0.875rem" }}>
                <CheckCircle2 size={14} /> All leads are up to date
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {alerts.slice(0, 6).map((alert: Record<string, unknown>) => {
                  const voucher = alert.trial_vouchers as Record<string, unknown> | null;
                  const isExpiringSoon = voucher?.expires_at && new Date(voucher.expires_at as string) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                  return (
                    <div key={alert.id as string} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", padding: "0.625rem", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "0.5rem" }}>
                      <Clock size={13} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "0.125rem" }} />
                      <div>
                        <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#f9fafb" }}>{alert.company_name as string}</div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          {isExpiringSoon ? "Trial expiring soon — no conversion" : "No activity in 7+ days"}
                          {" · "}{alert.stage as string}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Campaign performance */}
          <div style={{ ...cardStyle, padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <TrendingUp size={16} style={{ color: "#22c55e" }} />
              <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Recent Campaigns</h2>
            </div>
            {campaigns.length === 0 ? (
              <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>No campaigns sent yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {campaigns.slice(0, 5).map((c: Record<string, unknown>) => {
                  const sentCount = c.sent_count as number ?? 0;
                  const leadCount = c.lead_count as number ?? 1;
                  const pct = Math.round((sentCount / leadCount) * 100);
                  return (
                    <div key={c.id as string} style={{ padding: "0.625rem", background: "rgba(255,255,255,0.03)", borderRadius: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "0.8125rem", color: "#f9fafb" }}>{new Date(c.created_at as string).toLocaleDateString("en-ZA")}</span>
                        <span style={{ fontSize: "0.75rem", color: "#22c55e" }}>{pct}% delivered</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "#6b7280" }}>
                        <span>{leadCount} leads</span>
                        <span>{sentCount} sent</span>
                        <span>{c.seats as number} seats</span>
                        <span>{c.send_via as string}</span>
                      </div>
                      <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", marginTop: "0.375rem", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "#22c55e", borderRadius: "2px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Lead detail table */}
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={16} style={{ color: "#22c55e" }} />
              <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>All Leads</h2>
              <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>({allLeads.length})</span>
            </div>
            <Link href="/admin/leads" style={{ fontSize: "0.8125rem", color: "#22c55e", textDecoration: "none" }}>Manage leads →</Link>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Company", "Contact", "Stage", "Voucher", "Last activity"].map((h) => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allLeads.slice(0, 20).map((lead: Record<string, unknown>) => {
                  const stageColors: Record<string, string> = { imported: "#6b7280", voucher_sent: "#3b82f6", activated: "#22c55e", drivers_deployed: "#f59e0b", converted: "#8b5cf6", lost: "#f87171" };
                  const stageLabels: Record<string, string> = { imported: "Imported", voucher_sent: "Voucher Sent", activated: "Activated", drivers_deployed: "Deployed", converted: "Converted", lost: "Lost" };
                  const stage = lead.stage as string;
                  const voucher = lead.trial_vouchers as Record<string, unknown> | null;
                  return (
                    <tr key={lead.id as string} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", fontWeight: 600, color: "#f9fafb" }}>{lead.company_name as string || "—"}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ fontSize: "0.875rem", color: "#d1d5db" }}>{lead.contact_name as string || "—"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{lead.email as string}</div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.1875rem 0.5rem", borderRadius: "1rem", background: `${stageColors[stage] ?? "#6b7280"}20`, color: stageColors[stage] ?? "#6b7280" }}>
                          {stageLabels[stage] ?? stage}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "#6b7280", fontFamily: "monospace" }}>
                        {voucher ? (voucher.code as string) : "—"}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "#6b7280" }}>
                        {lead.last_activity_at ? new Date(lead.last_activity_at as string).toLocaleDateString("en-ZA") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
