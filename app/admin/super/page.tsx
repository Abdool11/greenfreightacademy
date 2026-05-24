"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, DollarSign, Users, BookOpen,
  AlertTriangle, CreditCard, FileText, BarChart2,
  RefreshCw, ArrowUpRight, CheckCircle2, Clock, Truck
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Panel = "sales" | "revenue" | "adoption" | "cohorts" | "cpd" | "incidents" | "paystack" | "eft" | "bulletin_revenue";

interface Tab { id: Panel; label: string; icon: React.ReactNode; }

// ─── Shared styles ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "#0a1628",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "0.875rem",
  padding: "1.25rem",
};

const statCard = (accent: string): React.CSSProperties => ({
  ...card,
  borderLeft: `3px solid ${accent}`,
});

const badge = (color: string): React.CSSProperties => ({
  fontSize: "0.6875rem",
  fontWeight: 700,
  padding: "0.125rem 0.5rem",
  borderRadius: "1rem",
  background: `${color}20`,
  color,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n}%`;

// ─── Stat card component ──────────────────────────────────────────────────────

function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div style={statCard(accent)}>
      <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600, marginBottom: "0.375rem" }}>{label}</div>
      <div style={{ fontSize: "1.75rem", fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.75rem", color: "#4b5563", marginTop: "0.25rem" }}>{sub}</div>}
    </div>
  );
}

// ─── Bar chart component ──────────────────────────────────────────────────────

function BarChart({ data, valueKey, labelKey, color }: { data: Record<string, unknown>[]; valueKey: string; labelKey: string; color: string }) {
  if (!data.length) return <div style={{ color: "#4b5563", fontSize: "0.875rem" }}>No data yet</div>;
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.25rem", height: "80px" }}>
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const h = Math.max(4, (val / max) * 72);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.125rem" }}>
            <div title={String(val)} style={{ width: "100%", height: `${h}px`, background: color, borderRadius: "2px 2px 0 0", minWidth: "4px" }} />
            <div style={{ fontSize: "0.5rem", color: "#4b5563", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "32px" }}>{String(d[labelKey])}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Panel components ─────────────────────────────────────────────────────────

function SalesPanel({ data }: { data: Record<string, unknown> }) {
  const leads = data.recentLeads as Record<string, unknown>[] ?? [];
  const stageColors: Record<string, string> = { imported: "#6b7280", voucher_sent: "#3b82f6", activated: "#22c55e", drivers_deployed: "#f59e0b", converted: "#8b5cf6", lost: "#f87171" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
        <Stat label="Total Leads" value={Number(data.totalLeads ?? 0)} accent="#3b82f6" />
        <Stat label="Vouchers Sent" value={Number(data.totalVouchersSent ?? 0)} accent="#f59e0b" />
        <Stat label="Activated" value={Number(data.totalActivated ?? 0)} accent="#22c55e" />
        <Stat label="Converted" value={Number(data.totalConverted ?? 0)} accent="#8b5cf6" />
        <Stat label="Conversion Rate" value={pct(Number(data.conversionRate ?? 0))} accent="#22c55e" sub="leads → full clients" />
        <Stat label="Activation Rate" value={pct(Number(data.activationRate ?? 0))} accent="#3b82f6" sub="sent → activated" />
      </div>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: "0.875rem", fontSize: "0.9375rem" }}>Recent Leads</div>
        {leads.length === 0 ? <div style={{ color: "#4b5563", fontSize: "0.875rem" }}>No leads yet</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Company", "Contact", "Stage", "Added"].map((h) => (
                  <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((l, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem", fontWeight: 600 }}>{String(l.company_name ?? "—")}</td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem", color: "#9ca3af" }}>{String(l.contact_name ?? "—")}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>
                    <span style={badge(stageColors[String(l.stage)] ?? "#6b7280")}>{String(l.stage ?? "").replace("_", " ")}</span>
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "#6b7280" }}>
                    {l.created_at ? new Date(String(l.created_at)).toLocaleDateString("en-ZA") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RevenuePanel({ data }: { data: Record<string, unknown> }) {
  const monthly = data.monthlyBreakdown as Record<string, unknown>[] ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
        <Stat label="Total Revenue (ZAR)" value={fmt(Number(data.totalRevenue ?? 0))} accent="#22c55e" />
        <Stat label="EFT Revenue" value={fmt(Number(data.eftRevenue ?? 0))} accent="#3b82f6" sub="bank transfers" />
        <Stat label="Paystack Revenue" value={fmt(Number(data.paystackRevenue ?? 0))} accent="#8b5cf6" sub="online payments" />
        <Stat label="Total Invoices Paid" value={Number(data.totalInvoices ?? 0)} accent="#f59e0b" />
      </div>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: "0.875rem", fontSize: "0.9375rem" }}>Monthly Revenue (This Year)</div>
        <BarChart data={monthly} valueKey="amount" labelKey="month" color="#22c55e" />
      </div>
    </div>
  );
}

function AdoptionPanel({ data }: { data: Record<string, unknown> }) {
  const growth = data.companyGrowth as Record<string, unknown>[] ?? [];
  const companies = data.topCompanies as Record<string, unknown>[] ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
        <Stat label="Total Companies" value={Number(data.totalCompanies ?? 0)} accent="#3b82f6" />
        <Stat label="Full Accounts" value={Number(data.activeCompanies ?? 0)} accent="#22c55e" />
        <Stat label="Trial Accounts" value={Number(data.trialCompanies ?? 0)} accent="#f59e0b" />
        <Stat label="Total Drivers" value={Number(data.totalDrivers ?? 0)} accent="#8b5cf6" />
        <Stat label="Active Drivers" value={Number(data.activeDrivers ?? 0)} accent="#22c55e" />
        <Stat label="Certificates Issued" value={Number(data.totalCerts ?? 0)} accent="#f59e0b" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: "0.875rem", fontSize: "0.9375rem" }}>Company Growth (This Year)</div>
          <BarChart data={growth} valueKey="count" labelKey="month" color="#3b82f6" />
        </div>
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: "0.875rem", fontSize: "0.9375rem" }}>Newest Companies</div>
          {companies.length === 0 ? <div style={{ color: "#4b5563", fontSize: "0.875rem" }}>No companies yet</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {companies.slice(0, 8).map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.875rem", color: "#d1d5db" }}>{String(c.name ?? "—")}</span>
                  <span style={badge(String(c.account_type) === "trial" ? "#f59e0b" : "#22c55e")}>{String(c.account_type ?? "full")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CohortsPanel({ data }: { data: Record<string, unknown> }) {
  const recent = data.recentDeployments as Record<string, unknown>[] ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
        <Stat label="Pending Payment" value={Number(data.pendingPayment ?? 0)} accent="#f59e0b" sub="awaiting EFT confirmation" />
        <Stat label="Active Cohorts" value={Number(data.activeCohorts ?? 0)} accent="#22c55e" sub="paid & deployed" />
        <Stat label="Completed" value={Number(data.completedCohorts ?? 0)} accent="#8b5cf6" sub="all drivers certified" />
        <Stat label="Total Deployments" value={Number(data.totalDeployments ?? 0)} accent="#3b82f6" />
      </div>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: "0.875rem", fontSize: "0.9375rem" }}>Recent Deployments</div>
        {recent.length === 0 ? <div style={{ color: "#4b5563", fontSize: "0.875rem" }}>No deployments yet</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Company", "Reference", "Value", "Status", "Deployed"].map((h) => (
                  <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((d, i) => {
                const q = d.quotes as Record<string, unknown> | null;
                const co = d.companies as Record<string, unknown> | null;
                const statusColors: Record<string, string> = { paid: "#22c55e", eft_submitted: "#f59e0b", sent: "#3b82f6" };
                const status = String(q?.status ?? "");
                return (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem", fontWeight: 600 }}>{String(co?.name ?? "—")}</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "#6b7280", fontFamily: "monospace" }}>{String(q?.reference_number ?? "—")}</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem", color: "#22c55e" }}>{fmt(Number(q?.total ?? 0))}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <span style={badge(statusColors[status] ?? "#6b7280")}>{status.replace("_", " ")}</span>
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "#6b7280" }}>
                      {d.deployed_at ? new Date(String(d.deployed_at)).toLocaleDateString("en-ZA") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CpdPanel({ data }: { data: Record<string, unknown> }) {
  const modules = data.modules as Record<string, unknown>[] ?? [];
  const library = data.libraryItems as Record<string, unknown>[] ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
        <Stat label="Total Modules" value={Number(data.totalModules ?? 0)} accent="#3b82f6" />
        <Stat label="Published" value={Number(data.publishedModules ?? 0)} accent="#22c55e" />
        <Stat label="Participants" value={Number(data.totalParticipants ?? 0)} accent="#8b5cf6" />
        <Stat label="Completions" value={Number(data.completedParticipants ?? 0)} accent="#22c55e" />
        <Stat label="Completion Rate" value={pct(Number(data.completionRate ?? 0))} accent="#f59e0b" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: "0.875rem", fontSize: "0.9375rem" }}>CPD Modules</div>
          {modules.length === 0 ? <div style={{ color: "#4b5563", fontSize: "0.875rem" }}>No modules yet</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {modules.slice(0, 8).map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "0.875rem", color: "#d1d5db" }}>{String(m.title ?? "—")}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{String(m.quarter ?? "")}</div>
                  </div>
                  <span style={badge(String(m.status) === "published" ? "#22c55e" : "#6b7280")}>{String(m.status ?? "draft")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: "0.875rem", fontSize: "0.9375rem" }}>CPD Library (Recent)</div>
          {library.length === 0 ? <div style={{ color: "#4b5563", fontSize: "0.875rem" }}>No library items yet</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {library.slice(0, 8).map((l, i) => {
                const statusColors: Record<string, string> = { submitted: "#6b7280", under_review: "#f59e0b", selected_for_cpd: "#3b82f6", developed_into_module: "#22c55e", archived: "#4b5563" };
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "0.875rem", color: "#d1d5db", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(l.title ?? "—")}</div>
                    <span style={badge(statusColors[String(l.status)] ?? "#6b7280")}>{String(l.status ?? "").replace(/_/g, " ")}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IncidentsPanel({ data }: { data: Record<string, unknown> }) {
  const bulletins = data.recentBulletins as Record<string, unknown>[] ?? [];
  const categories = data.categoryBreakdown as Record<string, unknown>[] ?? [];
  const urgencyColors: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e" };
  const scopeColors: Record<string, string> = { internal: "#3b82f6", industry: "#8b5cf6" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
        <Stat label="Total Bulletins" value={Number(data.totalBulletins ?? 0)} accent="#3b82f6" />
        <Stat label="Internal" value={Number(data.internalBulletins ?? 0)} accent="#3b82f6" />
        <Stat label="Industry CPD" value={Number(data.industryCpdBulletins ?? 0)} accent="#8b5cf6" />
        <Stat label="Delivery Rate" value={pct(Number(data.deliveryRate ?? 0))} accent="#22c55e" sub="30-day window" />
        <Stat label="Acknowledgement Rate" value={pct(Number(data.acknowledgementRate ?? 0))} accent="#f59e0b" sub="30-day window" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: "0.875rem", fontSize: "0.9375rem" }}>Recent Bulletins</div>
          {bulletins.length === 0 ? <div style={{ color: "#4b5563", fontSize: "0.875rem" }}>No bulletins yet</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {bulletins.slice(0, 8).map((b, i) => {
                const co = b.companies as Record<string, unknown> | null;
                return (
                  <div key={i} style={{ padding: "0.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "0.375rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.125rem" }}>
                      <span style={badge(urgencyColors[String(b.urgency)] ?? "#6b7280")}>{String(b.urgency ?? "low")}</span>
                      <span style={badge(scopeColors[String(b.scope)] ?? "#6b7280")}>{String(b.scope ?? "internal")}</span>
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#d1d5db" }}>{String(b.title ?? "—")}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{String(co?.name ?? "—")} · {b.created_at ? new Date(String(b.created_at)).toLocaleDateString("en-ZA") : ""}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: "0.875rem", fontSize: "0.9375rem" }}>By Category</div>
          {categories.length === 0 ? <div style={{ color: "#4b5563", fontSize: "0.875rem" }}>No data yet</div> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {categories.map((c, i) => {
                const total = categories.reduce((s, x) => s + (Number(x.count) || 0), 0);
                const pctVal = total ? Math.round((Number(c.count) / total) * 100) : 0;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "0.125rem" }}>
                      <span style={{ color: "#d1d5db", textTransform: "capitalize" }}>{String(c.cat ?? "")}</span>
                      <span style={{ color: "#6b7280" }}>{String(c.count)} ({pctVal}%)</span>
                    </div>
                    <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pctVal}%`, background: "#3b82f6", borderRadius: "2px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaystackPanel({ data }: { data: Record<string, unknown> }) {
  const txns = data.recentTransactions as Record<string, unknown>[] ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
        <Stat label="Total Paystack Revenue" value={fmt(Number(data.totalPaystackRevenue ?? 0))} accent="#8b5cf6" />
        <Stat label="This Month" value={fmt(Number(data.thisMonthPaystack ?? 0))} accent="#22c55e" />
        <Stat label="Total Transactions" value={Number(data.totalTransactions ?? 0)} accent="#3b82f6" />
      </div>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: "0.875rem", fontSize: "0.9375rem" }}>Paystack Transactions</div>
        {txns.length === 0 ? <div style={{ color: "#4b5563", fontSize: "0.875rem" }}>No Paystack transactions yet</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Company", "Reference", "Amount", "Date"].map((h) => (
                  <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map((t, i) => {
                const co = t.companies as Record<string, unknown> | null;
                return (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem", fontWeight: 600 }}>{String(co?.name ?? "—")}</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "#6b7280", fontFamily: "monospace" }}>{String(t.reference_number ?? "—")}</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem", color: "#22c55e" }}>{fmt(Number(t.total ?? 0))}</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "#6b7280" }}>
                      {t.paid_at ? new Date(String(t.paid_at)).toLocaleDateString("en-ZA") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function EftPanel({ data }: { data: Record<string, unknown> }) {
  const txns = data.recentTransactions as Record<string, unknown>[] ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
        <Stat label="Total EFT Revenue" value={fmt(Number(data.totalEftRevenue ?? 0))} accent="#3b82f6" />
        <Stat label="Pending EFT Value" value={fmt(Number(data.pendingEftValue ?? 0))} accent="#f59e0b" sub="awaiting confirmation" />
        <Stat label="Confirmed Transactions" value={Number(data.totalEftTransactions ?? 0)} accent="#22c55e" />
        <Stat label="Pending Transactions" value={Number(data.pendingEftCount ?? 0)} accent="#f59e0b" />
      </div>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: "0.875rem", fontSize: "0.9375rem" }}>EFT Transactions</div>
        {txns.length === 0 ? <div style={{ color: "#4b5563", fontSize: "0.875rem" }}>No EFT transactions yet</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Company", "Reference", "EFT Ref", "Amount", "Status", "Date"].map((h) => (
                  <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map((t, i) => {
                const co = t.companies as Record<string, unknown> | null;
                const statusColors: Record<string, string> = { paid: "#22c55e", eft_submitted: "#f59e0b" };
                const status = String(t.status ?? "");
                return (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem", fontWeight: 600 }}>{String(co?.name ?? "—")}</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "#6b7280", fontFamily: "monospace" }}>{String(t.reference_number ?? "—")}</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "#9ca3af", fontFamily: "monospace" }}>{String(t.eft_reference ?? "—")}</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem", color: "#22c55e" }}>{fmt(Number(t.total ?? 0))}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <span style={badge(statusColors[status] ?? "#6b7280")}>{status.replace("_", " ")}</span>
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "#6b7280" }}>
                      {(t.paid_at || t.eft_submitted_at) ? new Date(String(t.paid_at ?? t.eft_submitted_at)).toLocaleDateString("en-ZA") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Bulletin Revenue Panel ──────────────────────────────────────────────────

function BulletinRevenuePanel({ data }: { data: Record<string, unknown> }) {
  const payments = data.recentPayments as Record<string, unknown>[] ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
        <Stat label="Total Bulletin Revenue" value={fmt(Number(data.totalRevenue ?? 0))} accent="#f59e0b" />
        <Stat label="Card Payments" value={fmt(Number(data.cardRevenue ?? 0))} accent="#8b5cf6" sub="Paystack" />
        <Stat label="Invoice Revenue" value={fmt(Number(data.invoiceRevenue ?? 0))} accent="#3b82f6" sub="monthly invoice" />
        <Stat label="Pending Invoices" value={fmt(Number(data.pendingInvoiceRevenue ?? 0))} accent="#f97316" sub="awaiting payment" />
        <Stat label="Total Bulletins Paid" value={Number(data.totalPaidCount ?? 0)} accent="#22c55e" />
        <Stat label="Fee Waivers (CPD opt-in)" value={Number(data.waivedCount ?? 0)} accent="#6b7280" sub="fee waived" />
      </div>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: "0.875rem", fontSize: "0.9375rem" }}>Recent Bulletin Payments</div>
        {payments.length === 0 ? (
          <div style={{ color: "#4b5563", fontSize: "0.875rem" }}>No bulletin payments yet</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Company", "Amount", "Method", "Status", "Date"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "0.5rem 0.75rem", color: "#6b7280", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 15).map((p, i) => {
                  const co = p.companies as Record<string, unknown> | null;
                  const methodColor: Record<string, string> = { card: "#8b5cf6", invoice: "#3b82f6" };
                  const statusColor: Record<string, string> = { paid: "#22c55e", pending: "#f59e0b", failed: "#ef4444" };
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "0.5rem 0.75rem", color: "#d1d5db" }}>{String(co?.name ?? "—")}</td>
                      <td style={{ padding: "0.5rem 0.75rem", color: "#f9fafb", fontWeight: 600 }}>{fmt(Number(p.amount ?? 0))}</td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <span style={{ ...badge(methodColor[String(p.method)] ?? "#6b7280") }}>{String(p.method ?? "—")}</span>
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <span style={{ ...badge(statusColor[String(p.status)] ?? "#6b7280") }}>{String(p.status ?? "—")}</span>
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", color: "#6b7280" }}>
                        {p.created_at ? new Date(String(p.created_at)).toLocaleDateString("en-ZA") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS: Tab[] = [
  { id: "sales", label: "Sales", icon: <TrendingUp size={14} /> },
  { id: "revenue", label: "Revenue", icon: <DollarSign size={14} /> },
  { id: "adoption", label: "Adoption", icon: <Users size={14} /> },
  { id: "cohorts", label: "Cohorts", icon: <Truck size={14} /> },
  { id: "cpd", label: "CPD", icon: <BookOpen size={14} /> },
  { id: "incidents", label: "Incidents", icon: <AlertTriangle size={14} /> },
  { id: "paystack", label: "Paystack", icon: <CreditCard size={14} /> },
  { id: "eft", label: "EFT", icon: <FileText size={14} /> },
  { id: "bulletin_revenue", label: "Bulletin Revenue", icon: <AlertTriangle size={14} /> },
];

export default function SuperAdminDashboard() {
  const [activePanel, setActivePanel] = useState<Panel>("sales");
  const [panelData, setPanelData] = useState<Record<Panel, Record<string, unknown> | null>>({
    sales: null, revenue: null, adoption: null, cohorts: null,
    cpd: null, incidents: null, paystack: null, eft: null, bulletin_revenue: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchPanel = useCallback(async (panel: Panel) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/super?panel=${panel}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to load data"); return; }
      setPanelData((prev) => ({ ...prev, [panel]: data }));
      setLastRefresh(new Date());
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!panelData[activePanel]) {
      fetchPanel(activePanel);
    }
  }, [activePanel, panelData, fetchPanel]);

  const data = panelData[activePanel];

  return (
    <div style={{ minHeight: "100vh", background: "#060e1a", color: "#f9fafb" }}>
      {/* Top bar */}
      <div style={{ background: "#0a1628", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.125rem" }}>
            <Link href="/admin/dashboard" style={{ color: "#6b7280", textDecoration: "none", fontSize: "0.875rem" }}>Admin</Link>
            <span style={{ color: "#4b5563" }}>/</span>
            <span style={{ color: "#f9fafb", fontSize: "0.875rem" }}>CEO Dashboard</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
            <span style={{ color: "#22c55e" }}>CEO</span> Super-Admin Dashboard
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {lastRefresh && (
            <span style={{ fontSize: "0.75rem", color: "#4b5563" }}>
              Updated {lastRefresh.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => fetchPanel(activePanel)}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "#9ca3af", cursor: loading ? "default" : "pointer", fontSize: "0.8125rem" }}
          >
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ background: "#0a1628", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 1.5rem", display: "flex", gap: "0", overflowX: "auto" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            style={{
              display: "flex", alignItems: "center", gap: "0.375rem",
              padding: "0.875rem 1rem",
              background: "none",
              border: "none",
              borderBottom: activePanel === tab.id ? "2px solid #22c55e" : "2px solid transparent",
              color: activePanel === tab.id ? "#22c55e" : "#6b7280",
              fontWeight: activePanel === tab.id ? 700 : 400,
              fontSize: "0.875rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "0.625rem", marginBottom: "1rem", color: "#f87171", fontSize: "0.875rem" }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {loading && !data ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", color: "#6b7280" }}>
            <RefreshCw size={20} style={{ animation: "spin 1s linear infinite", marginRight: "0.75rem" }} />
            Loading {activePanel} data…
          </div>
        ) : !data ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280" }}>
            <BarChart2 size={32} style={{ margin: "0 auto 0.75rem", display: "block", opacity: 0.3 }} />
            <div>No data loaded yet</div>
          </div>
        ) : (
          <>
            {activePanel === "sales" && <SalesPanel data={data} />}
            {activePanel === "revenue" && <RevenuePanel data={data} />}
            {activePanel === "adoption" && <AdoptionPanel data={data} />}
            {activePanel === "cohorts" && <CohortsPanel data={data} />}
            {activePanel === "cpd" && <CpdPanel data={data} />}
            {activePanel === "incidents" && <IncidentsPanel data={data} />}
            {activePanel === "paystack" && <PaystackPanel data={data} />}
            {activePanel === "eft" && <EftPanel data={data} />}
            {activePanel === "bulletin_revenue" && <BulletinRevenuePanel data={data} />}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
