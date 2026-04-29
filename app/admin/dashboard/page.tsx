export const dynamic = "force-dynamic";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";

async function getPlatformStats() {
  const [
    { count: totalCompanies },
    { count: trialCompanies },
    { count: totalDrivers },
    { count: activeEnrolments },
    { count: pendingCohorts },
    { count: totalCerts },
  ] = await Promise.all([
    supabaseAdmin.from("companies").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin.from("companies").select("*", { count: "exact", head: true }).eq("account_type", "trial"),
    supabaseAdmin.from("drivers").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin.from("enrolments").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin.from("deployments").select("*", { count: "exact", head: true }).eq("approval_status", "pending_payment"),
    supabaseAdmin.from("certifications").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  return {
    totalCompanies: totalCompanies ?? 0,
    trialCompanies: trialCompanies ?? 0,
    totalDrivers: totalDrivers ?? 0,
    activeEnrolments: activeEnrolments ?? 0,
    pendingCohorts: pendingCohorts ?? 0,
    totalCerts: totalCerts ?? 0,
  };
}

async function getRecentActivity() {
  const { data: recentCompanies } = await supabaseAdmin
    .from("companies")
    .select("id, name, contact_email, account_type, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: pendingDeployments } = await supabaseAdmin
    .from("deployments")
    .select("id, company_id, created_at, approval_status, companies(name)")
    .in("approval_status", ["pending_payment", "payment_received"])
    .order("created_at", { ascending: false })
    .limit(5);

  return { recentCompanies: recentCompanies ?? [], pendingDeployments: pendingDeployments ?? [] };
}

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const stats = await getPlatformStats();
  const { recentCompanies, pendingDeployments } = await getRecentActivity();

  const isSuperAdmin = session.role === "super_admin";

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Top nav */}
      <nav className="bg-[#111f3a] border-b border-slate-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2ecc71] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-bold text-white">GFA Admin</span>
            <span className="text-slate-500 text-sm">/ Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">{session.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isSuperAdmin ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-300"}`}>
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </span>
            <form action="/api/admin/auth/logout" method="POST">
              <button type="submit" className="text-slate-400 hover:text-white text-sm transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Sidebar + Content */}
      <div className="max-w-7xl mx-auto flex gap-0">
        {/* Sidebar */}
        <aside className="w-56 min-h-[calc(100vh-65px)] bg-[#0d1a2e] border-r border-slate-700/50 py-6 px-3 flex-shrink-0">
          <nav className="space-y-1">
            {[
              { href: "/admin/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
              { href: "/admin/companies", label: "Companies", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
              { href: "/admin/cohorts", label: "Cohort Approvals", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
              { href: "/admin/programmes", label: "Programmes", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
              { href: "/admin/vouchers", label: "Trial Vouchers", icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" },
              { href: "/admin/leads", label: "Leads & Campaigns", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
              { href: "/admin/settings/messaging", label: "Messaging", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
              { href: "/admin/email-settings", label: "Email Settings", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
              { href: "/admin/pricing", label: "Pricing", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
              { href: "/admin/cpd-queue", label: "CPD Queue", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
              { href: "/admin/stats", label: "Impact Stats & Contact", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
              ...(isSuperAdmin ? [
                { href: "/admin/funnel", label: "Sales Funnel", icon: "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" },
                { href: "/admin/super", label: "CEO Dashboard", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
              ] : []),
              { href: "/admin/data", label: "Data Management", icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors text-sm"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
            <p className="text-slate-400 text-sm mt-1">GreenFreightAcademy · Live data from Supabase</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              { label: "Active Companies", value: stats.totalCompanies - stats.trialCompanies, color: "text-[#2ecc71]", sub: `${stats.trialCompanies} on trial` },
              { label: "Registered Drivers", value: stats.totalDrivers, color: "text-blue-400", sub: "across all companies" },
              { label: "Active Enrolments", value: stats.activeEnrolments, color: "text-purple-400", sub: "in training" },
              { label: "Certificates Issued", value: stats.totalCerts, color: "text-amber-400", sub: "all time" },
              { label: "Pending Cohorts", value: stats.pendingCohorts, color: stats.pendingCohorts > 0 ? "text-red-400" : "text-slate-400", sub: "awaiting payment" },
              { label: "Trial Accounts", value: stats.trialCompanies, color: "text-cyan-400", sub: "active trials" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#111f3a] border border-slate-700/50 rounded-xl p-5">
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</div>
                <div className="text-white text-sm font-medium mt-1">{stat.label}</div>
                <div className="text-slate-500 text-xs mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Two-column activity panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending cohort approvals */}
            <div className="bg-[#111f3a] border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Cohorts Awaiting Approval</h2>
                <Link href="/admin/cohorts" className="text-[#2ecc71] text-sm hover:underline">
                  View all →
                </Link>
              </div>
              {pendingDeployments.length === 0 ? (
                <p className="text-slate-500 text-sm">No cohorts pending approval</p>
              ) : (
                <div className="space-y-3">
                  {pendingDeployments.map((d: Record<string, unknown>) => (
                    <div key={d.id as string} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                      <div>
                        <div className="text-white text-sm font-medium">
                          {(d.companies as Record<string, unknown>)?.name as string ?? "Unknown Company"}
                        </div>
                        <div className="text-slate-500 text-xs">
                          {new Date(d.created_at as string).toLocaleDateString("en-ZA")}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        d.approval_status === "payment_received"
                          ? "bg-[#2ecc71]/20 text-[#2ecc71]"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {d.approval_status === "payment_received" ? "Payment received" : "Pending payment"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent company registrations */}
            <div className="bg-[#111f3a] border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Recent Companies</h2>
                <Link href="/admin/companies" className="text-[#2ecc71] text-sm hover:underline">
                  View all →
                </Link>
              </div>
              {recentCompanies.length === 0 ? (
                <p className="text-slate-500 text-sm">No companies registered yet</p>
              ) : (
                <div className="space-y-3">
                  {recentCompanies.map((c: Record<string, unknown>) => (
                    <div key={c.id as string} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                      <div>
                        <div className="text-white text-sm font-medium">{c.name as string}</div>
                        <div className="text-slate-500 text-xs">{c.contact_email as string}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.account_type === "trial"
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "bg-[#2ecc71]/20 text-[#2ecc71]"
                      }`}>
                        {c.account_type === "trial" ? "Trial" : "Full"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
