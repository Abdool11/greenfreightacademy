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
  course_id: string;
  status: string;
  progress_modules: number;
  link_activated: boolean;
  certified: boolean;
  nudge_sent_at: string | null;
  enrolled_at: string;
  courses: Course | null;
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
  status: string;
  trial_expires_at?: string;
  created_at: string;
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

export default async function AdminCompanyDetailPage({ params }: { params: { id: string } }) {
  await requireAdminSession();

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("id, name, contact_name, contact_email, contact_phone, account_type, status, trial_expires_at, created_at")
    .eq("id", params.id)
    .single() as { data: Company | null };

  if (!company) notFound();

  const { data: drivers } = await supabaseAdmin
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
        course_id,
        status,
        progress_modules,
        link_activated,
        certified,
        nudge_sent_at,
        enrolled_at,
        courses(id, name, slug, module_count, status)
      )
    `)
    .eq("company_id", params.id)
    .order("last_name", { ascending: true }) as { data: Driver[] | null };

  const { data: courses } = await supabaseAdmin
    .from("courses")
    .select("id, name, slug, module_count, status")
    .eq("status", "active")
    .order("name") as { data: Course[] | null };

  const driverList = drivers ?? [];
  const courseList = courses ?? [];

  const totalDrivers = driverList.length;
  const activatedDrivers = driverList.filter(d => d.enrolments.some(e => e.link_activated)).length;
  const certifiedDrivers = driverList.filter(d => d.enrolments.some(e => e.certified)).length;
  const enrolledDrivers = driverList.filter(d => d.enrolments.length > 0).length;

  const statusColor: Record<string, string> = {
    active: "#22c55e", trial: "#f59e0b", suspended: "#ef4444", inactive: "#6b7280",
    enrolled: "#3b82f6", "in-progress": "#f59e0b", completed: "#8b5cf6",
    certified: "#22c55e", overdue: "#ef4444",
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
                <Badge label={company.status} color={statusColor[company.status] ?? "#6b7280"} />
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
            { label: "Total Drivers", value: totalDrivers, color: "#3b82f6" },
            { label: "Enrolled", value: enrolledDrivers, color: "#22c55e" },
            { label: "Link Activated", value: activatedDrivers, color: "#f59e0b" },
            { label: "Certified", value: certifiedDrivers, color: "#a78bfa" },
          ].map(m => (
            <div key={m.label} style={{ background: "#111f3a", border: "1px solid rgba(100,116,139,0.3)", borderRadius: "0.875rem", padding: "1.25rem" }}>
              <div style={{ color: "#94a3b8", fontSize: "0.8125rem", marginBottom: "0.5rem" }}>{m.label}</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
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
                        const enrolment = driver.enrolments.find(e => e.course_id === c.id);
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
                              {enrolment?.link_activated
                                ? <span style={{ color: "#22c55e", fontSize: "1rem" }}>✓</span>
                                : <span style={{ color: "#1e293b", fontSize: "0.75rem" }}>—</span>}
                            </td>
                            {/* Progress */}
                            <td key={`${driver.id}-${c.id}-p`} style={{ padding: "0.75rem 0.375rem", textAlign: "center" }}>
                              {enrolment
                                ? <ProgressBar done={enrolment.progress_modules || 0} total={moduleTotal} />
                                : <span style={{ color: "#1e293b", fontSize: "0.75rem" }}>—</span>}
                            </td>
                            {/* Certified */}
                            <td key={`${driver.id}-${c.id}-c`} style={{ padding: "0.75rem 0.375rem", textAlign: "center" }}>
                              {enrolment?.certified
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
