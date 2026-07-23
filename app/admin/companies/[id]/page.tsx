export const dynamic = "force-dynamic";

import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Course {
  id: string;
  name: string;
  slug: string;
  module_count: number;
  status: string;
}

interface Enrolment {
  id: string;
  programme_id: string;
  programme_slug: string;
  status: string;
  progress_percent: number;
  modules_completed: number;
  started_at: string | null;
  completed_at: string | null;
  campaign_id: string | null;
}

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  mobile: string;
  email?: string;
  branch?: string;
  region?: string;
  status: string;
  created_at: string;
  enrolments: Enrolment[];
}

interface Company {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  account_type: string;
  subscription_status: string;
  credit_balance: number;
  trial_expires_at?: string;
  created_at: string;
}

interface QuoteRow {
  id: string;
  reference: string;
  total: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
}

interface DeploymentRow {
  id: string;
  programme_id: string;
  seats: number;
  status: string;
  approval_status: string | null;
  created_at: string;
  deployed_at: string | null;
  magic_links_sent_count: number | null;
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = pct >= 100 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#3b82f6";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}>
      <span style={{ color: "#f9fafb", fontWeight: 700, fontSize: "0.75rem" }}>{done}/{total}</span>
      <div style={{ width: "40px", height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "9999px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "9999px" }} />
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      background: color + "20", color, border: `1px solid ${color}40`,
      borderRadius: "1rem", padding: "0.125rem 0.5rem", fontSize: "0.6875rem", fontWeight: 600, whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

export default async function AdminCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();

  const { id } = await params;

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("id, name, contact_name, contact_email, contact_phone, account_type, subscription_status, credit_balance, trial_expires_at, created_at")
    .eq("id", id)
    .single() as { data: Company | null };

  if (!company) notFound();

  const { data: drivers, error: driversError } = await supabaseAdmin
    .from("drivers")
    .select(`
      id,
      first_name,
      last_name,
      mobile,
      email,
      branch,
      region,
      status,
      created_at,
      enrolments(
        id,
        programme_id,
        programme_slug,
        status,
        progress_percent,
        modules_completed,
        started_at,
        completed_at,
        campaign_id
      )
    `)
    .eq("company_id", id)
    .order("last_name", { ascending: true }) as { data: Driver[] | null; error: unknown };

  const { data: courses } = await supabaseAdmin
    .from("courses")
    .select("id, name, slug, module_count, status")
    .eq("status", "active")
    .order("name") as { data: Course[] | null };

  const { data: quotes } = await supabaseAdmin
    .from("quotes")
    .select("id, reference, total, status, payment_method, created_at, paid_at")
    .eq("company_id", id)
    .order("created_at", { ascending: false })
    .limit(10) as { data: QuoteRow[] | null };

  const { data: payments } = await supabaseAdmin
    .from("payments")
    .select("id, amount, payment_method, status, created_at, confirmed_at")
    .eq("company_id", id)
    .order("created_at", { ascending: false })
    .limit(10) as { data: PaymentRow[] | null };

  const { count: deploymentCount } = await supabaseAdmin
    .from("deployments")
    .select("*", { count: "exact", head: true })
    .eq("company_id", id);

  const { data: deployments } = await supabaseAdmin
    .from("deployments")
    .select("id, programme_id, seats, status, approval_status, created_at, deployed_at, magic_links_sent_count")
    .eq("company_id", id)
    .order("created_at", { ascending: false })
    .limit(10) as { data: DeploymentRow[] | null };

  if (driversError) console.error("[company-detail] drivers query error:", driversError);

  const driverList = drivers ?? [];
  const courseList = courses ?? [];
  const quoteList = quotes ?? [];
  const paymentList = payments ?? [];
  const deploymentList = deployments ?? [];
  const credits = Number(company.credit_balance ?? 0);

  const totalDrivers = driverList.length;
  const activatedDrivers = driverList.filter(d => d.enrolments.some(e => e.started_at)).length;
  const certifiedDrivers = driverList.filter(d => d.enrolments.some(e => e.completed_at)).length;
  const enrolledDrivers = driverList.filter(d => d.enrolments.length > 0).length;
  const totalEnrolments = driverList.reduce((sum, d) => sum + d.enrolments.length, 0);

  const statusColor: Record<string, string> = {
    active: "#22c55e", trial: "#f59e0b", suspended: "#ef4444", inactive: "#6b7280",
    enrolled: "#3b82f6", "in-progress": "#f59e0b", completed: "#8b5cf6",
    certified: "#22c55e", overdue: "#ef4444",
    confirmed: "#22c55e", pending: "#f59e0b",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a1628", color: "#f9fafb" }}>
      {/* Nav */}
      <nav style={{ background: "#111f3a", borderBottom: "1px solid rgba(100,116,139,0.3)", padding: "1rem 1.5rem" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/admin/companies" style={{ color: "#94a3b8", fontSize: "0.875rem", textDecoration: "none" }}>← Companies</Link>
          <span style={{ color: "#475569" }}>/</span>
          <span style={{ color: "#f9fafb", fontSize: "0.875rem", fontWeight: 600 }}>{company.name}</span>
        </div>
      </nav>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Company header */}
        <div style={{ background: "#111f3a", border: "1px solid rgba(100,116,139,0.3)", borderRadius: "1rem", padding: "1.5rem 2rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{company.name}</h1>
                <Badge label={company.subscription_status} color={statusColor[company.subscription_status] ?? "#6b7280"} />
                <Badge label={company.account_type} color="#60a5fa" />
              </div>
              <div style={{ display: "flex", gap: "2rem", color: "#94a3b8", fontSize: "0.875rem", flexWrap: "wrap" }}>
                <span>{company.contact_name}</span>
                <span>{company.contact_email}</span>
                <span>{company.contact_phone}</span>
                <span>Registered {new Date(company.created_at).toLocaleDateString("en-ZA")}</span>
                {company.trial_expires_at && (
                  <span style={{ color: "#f59e0b" }}>Trial expires {new Date(company.trial_expires_at).toLocaleDateString("en-ZA")}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Credit Balance", value: credits, color: "#2ecc71" },
            { label: "Total Drivers", value: totalDrivers, color: "#3b82f6" },
            { label: "Enrolled", value: enrolledDrivers, color: "#22c55e" },
            { label: "Enrolments", value: totalEnrolments, color: "#60a5fa" },
            { label: "Link Activated", value: activatedDrivers, color: "#f59e0b" },
            { label: "Certified", value: certifiedDrivers, color: "#a78bfa" },
            { label: "Deployments", value: deploymentCount ?? 0, color: "#f472b6" },
          ].map(m => (
            <div key={m.label} style={{ background: "#111f3a", border: "1px solid rgba(100,116,139,0.3)", borderRadius: "0.875rem", padding: "1.25rem" }}>
              <div style={{ color: "#94a3b8", fontSize: "0.8125rem", marginBottom: "0.5rem" }}>{m.label}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Payment & Quote History */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
          {/* Quotes */}
          <div>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.125rem", fontWeight: 700 }}>Recent Quotes</h2>
            {quoteList.length === 0 ? (
              <div style={{ background: "#111f3a", border: "1px dashed rgba(100,116,139,0.3)", borderRadius: "0.875rem", padding: "2rem", textAlign: "center", color: "#475569", fontSize: "0.875rem" }}>
                No quotes yet.
              </div>
            ) : (
              <div style={{ background: "#111f3a", border: "1px solid rgba(100,116,139,0.3)", borderRadius: "0.875rem", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(100,116,139,0.3)" }}>
                      <th style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Reference</th>
                      <th style={{ padding: "0.625rem 1rem", textAlign: "right", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Total</th>
                      <th style={{ padding: "0.625rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Status</th>
                      <th style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quoteList.map((q, i) => (
                      <tr key={q.id} style={{ borderBottom: i < quoteList.length - 1 ? "1px solid rgba(100,116,139,0.1)" : "none" }}>
                        <td style={{ padding: "0.625rem 1rem", color: "#94a3b8", fontFamily: "monospace", fontSize: "0.75rem" }}>{q.reference}</td>
                        <td style={{ padding: "0.625rem 1rem", textAlign: "right", color: "#22c55e", fontWeight: 600 }}>R {Number(q.total).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: "0.625rem 1rem", textAlign: "center" }}><Badge label={q.status} color={statusColor[q.status] ?? "#6b7280"} /></td>
                        <td style={{ padding: "0.625rem 1rem", color: "#64748b", fontSize: "0.75rem" }}>{new Date(q.created_at).toLocaleDateString("en-ZA")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payments */}
          <div>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.125rem", fontWeight: 700 }}>Payment History</h2>
            {paymentList.length === 0 ? (
              <div style={{ background: "#111f3a", border: "1px dashed rgba(100,116,139,0.3)", borderRadius: "0.875rem", padding: "2rem", textAlign: "center", color: "#475569", fontSize: "0.875rem" }}>
                No payments yet.
              </div>
            ) : (
              <div style={{ background: "#111f3a", border: "1px solid rgba(100,116,139,0.3)", borderRadius: "0.875rem", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid rgba(100,116,139,0.3)" }}>
                      <th style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Method</th>
                      <th style={{ padding: "0.625rem 1rem", textAlign: "right", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Amount</th>
                      <th style={{ padding: "0.625rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Status</th>
                      <th style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentList.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: i < paymentList.length - 1 ? "1px solid rgba(100,116,139,0.1)" : "none" }}>
                        <td style={{ padding: "0.625rem 1rem", color: "#94a3b8", textTransform: "capitalize" }}>{p.payment_method}</td>
                        <td style={{ padding: "0.625rem 1rem", textAlign: "right", color: "#22c55e", fontWeight: 600 }}>R {Number(p.amount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: "0.625rem 1rem", textAlign: "center" }}><Badge label={p.status} color={statusColor[p.status] ?? "#f59e0b"} /></td>
                        <td style={{ padding: "0.625rem 1rem", color: "#64748b", fontSize: "0.75rem" }}>{new Date(p.confirmed_at || p.created_at).toLocaleDateString("en-ZA")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Deployments */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.125rem", fontWeight: 700 }}>Deployments</h2>
          {deploymentList.length === 0 ? (
            <div style={{ background: "#111f3a", border: "1px dashed rgba(100,116,139,0.3)", borderRadius: "0.875rem", padding: "2rem", textAlign: "center", color: "#475569", fontSize: "0.875rem" }}>
              No deployments yet.
            </div>
          ) : (
            <div style={{ background: "#111f3a", border: "1px solid rgba(100,116,139,0.3)", borderRadius: "0.875rem", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(100,116,139,0.3)" }}>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Programme</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Seats</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Approval</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Links Sent</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {deploymentList.map((d, i) => (
                    <tr key={d.id} style={{ borderBottom: i < deploymentList.length - 1 ? "1px solid rgba(100,116,139,0.1)" : "none" }}>
                      <td style={{ padding: "0.625rem 1rem", color: "#f9fafb", fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem" }}>{d.programme_id}</td>
                      <td style={{ padding: "0.625rem 1rem", textAlign: "center", color: "#94a3b8" }}>{d.seats}</td>
                      <td style={{ padding: "0.625rem 1rem", textAlign: "center" }}><Badge label={d.status} color={statusColor[d.status] ?? "#6b7280"} /></td>
                      <td style={{ padding: "0.625rem 1rem", textAlign: "center" }}>{d.approval_status ? <Badge label={d.approval_status} color={d.approval_status === "approved" ? "#22c55e" : "#f59e0b"} /> : <span style={{ color: "#1e293b", fontSize: "0.75rem" }}>—</span>}</td>
                      <td style={{ padding: "0.625rem 1rem", textAlign: "center", color: "#94a3b8" }}>{d.magic_links_sent_count ?? 0}</td>
                      <td style={{ padding: "0.625rem 1rem", color: "#64748b", fontSize: "0.75rem" }}>{new Date(d.deployed_at || d.created_at).toLocaleDateString("en-ZA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Driver List */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.125rem", fontWeight: 700 }}>Drivers ({driverList.length})</h2>
          {driverList.length === 0 ? (
            <div style={{ background: "#111f3a", border: "1px dashed rgba(100,116,139,0.3)", borderRadius: "0.875rem", padding: "2rem", textAlign: "center", color: "#475569", fontSize: "0.875rem" }}>
              No drivers imported yet.
            </div>
          ) : (
            <div style={{ background: "#111f3a", border: "1px solid rgba(100,116,139,0.3)", borderRadius: "0.875rem", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(100,116,139,0.3)" }}>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Name</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Contact</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Enrolments</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Activated</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Certified</th>
                    <th style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {driverList.map((d, i) => (
                    <tr key={d.id} style={{ borderBottom: i < driverList.length - 1 ? "1px solid rgba(100,116,139,0.1)" : "none" }}>
                      <td style={{ padding: "0.625rem 1rem", color: "#f9fafb", fontWeight: 600 }}>
                        {d.first_name} {d.last_name}
                        {d.branch && <div style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 400 }}>{d.branch}</div>}
                      </td>
                      <td style={{ padding: "0.625rem 1rem", color: "#94a3b8" }}>
                        <div>{d.mobile}</div>
                        {d.email && <div style={{ color: "#64748b", fontSize: "0.75rem" }}>{d.email}</div>}
                      </td>
                      <td style={{ padding: "0.625rem 1rem", textAlign: "center" }}><Badge label={d.status} color={statusColor[d.status] ?? "#6b7280"} /></td>
                      <td style={{ padding: "0.625rem 1rem", textAlign: "center", color: "#94a3b8" }}>{d.enrolments.length}</td>
                      <td style={{ padding: "0.625rem 1rem", textAlign: "center" }}>{d.enrolments.some(e => e.started_at) ? <span style={{ color: "#22c55e" }}>✓</span> : <span style={{ color: "#1e293b" }}>—</span>}</td>
                      <td style={{ padding: "0.625rem 1rem", textAlign: "center" }}>{d.enrolments.some(e => e.completed_at) ? <span style={{ color: "#a78bfa" }}>★</span> : <span style={{ color: "#1e293b" }}>—</span>}</td>
                      <td style={{ padding: "0.625rem 1rem", color: "#64748b", fontSize: "0.75rem" }}>{new Date(d.created_at).toLocaleDateString("en-ZA")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Training Matrix */}
        <div>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.125rem", fontWeight: 700 }}>Training Matrix</h2>

          {driverList.length === 0 ? (
            <div style={{ background: "#111f3a", border: "1px dashed rgba(100,116,139,0.3)", borderRadius: "0.875rem", padding: "3rem", textAlign: "center", color: "#475569" }}>
              No drivers imported yet.
            </div>
          ) : courseList.length === 0 ? (
            <div style={{ background: "#111f3a", border: "1px dashed rgba(100,116,139,0.3)", borderRadius: "0.875rem", padding: "3rem", textAlign: "center", color: "#475569" }}>
              No active programmes configured.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", background: "#111f3a", borderRadius: "0.875rem", overflow: "hidden", border: "1px solid rgba(100,116,139,0.3)", minWidth: `${280 + courseList.length * 280}px` }}>
                <thead>
                  {/* Programme name row */}
                  <tr style={{ borderBottom: "1px solid rgba(100,116,139,0.2)", background: "rgba(0,0,0,0.2)" }}>
                    <th colSpan={2} style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#475569", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase" }}>Driver</th>
                    {courseList.map(c => (
                      <th key={c.id} colSpan={4} style={{ padding: "0.625rem 0.5rem", textAlign: "center", color: "#f9fafb", fontSize: "0.75rem", fontWeight: 700, borderLeft: "1px solid rgba(100,116,139,0.2)", whiteSpace: "nowrap" }}>
                        {c.name}
                      </th>
                    ))}
                  </tr>
                  {/* Sub-column headers */}
                  <tr style={{ borderBottom: "2px solid rgba(100,116,139,0.3)" }}>
                    <th style={{ padding: "0.5rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", whiteSpace: "nowrap" }}>Name</th>
                    <th style={{ padding: "0.5rem 1rem", textAlign: "left", color: "#64748b", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>Contact</th>
                    {courseList.map(c => (
                      <>
                        <th key={`${c.id}-s`} style={{ padding: "0.5rem 0.375rem", textAlign: "center", color: "#22c55e", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", borderLeft: "1px solid rgba(100,116,139,0.2)" }}>Status</th>
                        <th key={`${c.id}-l`} style={{ padding: "0.5rem 0.375rem", textAlign: "center", color: "#60a5fa", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" }}>Link<br />Active</th>
                        <th key={`${c.id}-p`} style={{ padding: "0.5rem 0.375rem", textAlign: "center", color: "#f59e0b", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase" }}>Progress</th>
                        <th key={`${c.id}-c`} style={{ padding: "0.5rem 0.375rem", textAlign: "center", color: "#a78bfa", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase" }}>Certified</th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {driverList.map((driver, i) => (
                    <tr key={driver.id} style={{ borderBottom: i < driverList.length - 1 ? "1px solid rgba(100,116,139,0.1)" : "none" }}>
                      <td style={{ padding: "0.875rem 1rem", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 600, color: "#f9fafb", fontSize: "0.875rem" }}>{driver.first_name} {driver.last_name}</div>
                        {driver.branch && <div style={{ color: "#64748b", fontSize: "0.75rem" }}>{driver.branch}</div>}
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <div style={{ color: "#94a3b8", fontSize: "0.8125rem" }}>{driver.mobile}</div>
                        {driver.email && <div style={{ color: "#64748b", fontSize: "0.75rem" }}>{driver.email}</div>}
                      </td>
                      {courseList.map(c => {
                        const enrolment = driver.enrolments.find(e => e.programme_id === c.slug || e.programme_slug === c.slug);
                        const moduleTotal = c.module_count || 12;
                        return (
                          <>
                            {/* Status */}
                            <td key={`${driver.id}-${c.id}-s`} style={{ padding: "0.75rem 0.375rem", textAlign: "center", borderLeft: "1px solid rgba(100,116,139,0.1)" }}>
                              {enrolment
                                ? <Badge label={enrolment.status} color={statusColor[enrolment.status] ?? "#6b7280"} />
                                : <span style={{ color: "#1e293b", fontSize: "0.75rem" }}>—</span>}
                            </td>
                            {/* Link Activated */}
                            <td key={`${driver.id}-${c.id}-l`} style={{ padding: "0.75rem 0.375rem", textAlign: "center" }}>
                              {enrolment?.started_at
                                ? <span style={{ color: "#22c55e", fontSize: "1rem" }}>✓</span>
                                : <span style={{ color: "#1e293b", fontSize: "0.75rem" }}>—</span>}
                            </td>
                            {/* Progress */}
                            <td key={`${driver.id}-${c.id}-p`} style={{ padding: "0.75rem 0.375rem", textAlign: "center" }}>
                              {enrolment
                                ? <ProgressBar done={enrolment.modules_completed || 0} total={moduleTotal} />
                                : <span style={{ color: "#1e293b", fontSize: "0.75rem" }}>—</span>}
                            </td>
                            {/* Certified */}
                            <td key={`${driver.id}-${c.id}-c`} style={{ padding: "0.75rem 0.375rem", textAlign: "center" }}>
                              {enrolment?.completed_at
                                ? <span style={{ color: "#a78bfa", fontSize: "1rem" }}>★</span>
                                : <span style={{ color: "#1e293b", fontSize: "0.75rem" }}>—</span>}
                            </td>
                          </>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
