"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users, Award, Upload, CheckCircle2, Loader2, Send,
  CreditCard, BarChart3, FileText, LogOut, RefreshCw, Bell, BookOpen, Zap, Target,
} from "lucide-react";
import CampaignSetupModal from "@/components/CampaignSetupModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  name: string;
  slug: string;
  module_count: number;
  status: string;
}

interface DriverEnrolment {
  id: string;
  course_id: string;
  status: string;
  progress_modules: number;
  link_activated: boolean;
  certified: boolean;
  nudge_sent_at: string | null;
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
  enrolments: DriverEnrolment[];
}

interface Quote {
  id: string;
  reference: string;
  total: number;
  status: string;
  created_at: string;
  paid_at?: string;
  deployed_at?: string;
  line_items: Array<{ driverName: string; courseName: string; price: number }>;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = pct >= 100 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#3b82f6";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
      <span style={{ color: "#f9fafb", fontWeight: 700, fontSize: "0.8125rem" }}>{done}/{total}</span>
      <div style={{ width: "44px", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "9999px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "9999px" }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    enrolled:      { color: "#3b82f6", label: "Enrolled" },
    active:        { color: "#f59e0b", label: "Active" },
    "in-progress": { color: "#f59e0b", label: "In Progress" },
    completed:     { color: "#8b5cf6", label: "Completed" },
    certified:     { color: "#22c55e", label: "Certified" },
    overdue:       { color: "#ef4444", label: "Overdue" },
    pending:       { color: "#6b7280", label: "Pending" },
    paid:          { color: "#3b82f6", label: "Paid" },
    deployed:      { color: "#22c55e", label: "Deployed" },
  };
  const s = map[status] ?? { color: "#6b7280", label: status };
  return (
    <span style={{
      background: s.color + "20", color: s.color,
      border: "1px solid " + s.color + "40", borderRadius: "1rem",
      padding: "0.125rem 0.5rem", fontSize: "0.6875rem", fontWeight: 600, whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

export default function DashboardPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  // Enrolment selection: driverId → Set<courseId>
  const [selectedEnrolments, setSelectedEnrolments] = useState<Record<string, Set<string>>>({});
  // Nudge selection: Set<enrolmentId>
  const [selectedNudges, setSelectedNudges] = useState<Set<string>>(new Set());
  const [quoting, setQuoting] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [sendingNudge, setSendingNudge] = useState(false);
  const [nudgeSent, setNudgeSent] = useState(false);
  // Campaign setup modal
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [pendingDeployQuoteId, setPendingDeployQuoteId] = useState<string | null>(null);
  const [pendingEnrolmentIds, setPendingEnrolmentIds] = useState<string[]>([]);
  const [campaignCreated, setCampaignCreated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [driversRes, quotesRes, coursesRes] = await Promise.all([
        fetch("/api/company/drivers"),
        fetch("/api/company/quotes"),
        fetch("/api/admin/programmes"),
      ]);
      if (driversRes.status === 401) { window.location.href = "/login"; return; }
      const driversData = await driversRes.json();
      const quotesData = quotesRes.ok ? await quotesRes.json() : { quotes: [] };
      setDrivers(driversData.drivers ?? []);
      setQuotes(quotesData.quotes ?? []);
      if (driversData.companyName) setCompanyName(driversData.companyName);
      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        setCourses((cData.programmes ?? []).filter((p: Course) => p.status === "active"));
      }
    } catch { /* silently fail */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Enrolment selection ──────────────────────────────────────────────────────
  const toggleEnrol = (driverId: string, courseId: string) => {
    setSelectedEnrolments(prev => {
      const next = { ...prev };
      const set = new Set(next[driverId] || []);
      if (set.has(courseId)) set.delete(courseId); else set.add(courseId);
      next[driverId] = set;
      return next;
    });
  };

  const selectAllForDriver = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) return;
    const enrolledIds = new Set(driver.enrolments.map(e => e.course_id));
    const unenrolled = courses.filter(c => !enrolledIds.has(c.id)).map(c => c.id);
    setSelectedEnrolments(prev => ({ ...prev, [driverId]: new Set(unenrolled) }));
  };

  const selectAllForCourse = (courseId: string) => {
    setSelectedEnrolments(prev => {
      const next = { ...prev };
      drivers.forEach(driver => {
        const isEnrolled = driver.enrolments.some(e => e.course_id === courseId);
        if (!isEnrolled) {
          const set = new Set(next[driver.id] || []);
          set.add(courseId);
          next[driver.id] = set;
        }
      });
      return next;
    });
  };

  const totalSelected = Object.values(selectedEnrolments).reduce((sum, set) => sum + set.size, 0);

  // ── Nudge selection ──────────────────────────────────────────────────────────
  const toggleNudge = (enrolmentId: string) => {
    setSelectedNudges(prev => {
      const next = new Set(prev);
      if (next.has(enrolmentId)) next.delete(enrolmentId); else next.add(enrolmentId);
      return next;
    });
  };

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleGetQuote = async () => {
    if (totalSelected === 0) return;
    setQuoting(true);
    try {
      const items = Object.entries(selectedEnrolments)
        .filter(([, s]) => s.size > 0)
        .map(([driverId, courseSet]) => {
          const driver = drivers.find(d => d.id === driverId);
          return { driverId, driverName: driver ? driver.first_name + " " + driver.last_name : driverId, courseIds: [...courseSet] };
        });
      const res = await fetch("/api/company/quote", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }),
      });
      if (res.ok) { setQuoteSent(true); setSelectedEnrolments({}); await fetchData(); }
    } finally { setQuoting(false); }
  };

  const handleConfirmPayment = async (quoteId: string) => {
    setConfirmingPayment(quoteId);
    try {
      await fetch("/api/company/confirm-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoteId }) });
      await fetchData();
    } finally { setConfirmingPayment(null); }
  };

  const handleDeploy = async (quoteId: string) => {
    setDeploying(quoteId);
    try {
      const res = await fetch("/api/company/deploy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quoteId }) });
      if (res.ok) {
        // After deploying, gather the newly created enrolment IDs and show campaign setup
        const driversRes = await fetch("/api/company/drivers");
        const driversData = await driversRes.json();
        const allEnrolments: string[] = (driversData.drivers ?? []).flatMap((d: { enrolments: Array<{ id: string; quote_id?: string }> }) =>
          d.enrolments.filter((e) => e.quote_id === quoteId).map((e) => e.id)
        );
        if (allEnrolments.length > 0) {
          setPendingDeployQuoteId(quoteId);
          setPendingEnrolmentIds(allEnrolments);
          setShowCampaignModal(true);
        }
        await fetchData();
      }
    } finally { setDeploying(null); }
  };

  const handleSendNudges = async () => {
    if (selectedNudges.size === 0) return;
    setSendingNudge(true);
    try {
      const res = await fetch("/api/company/nudge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrolmentIds: [...selectedNudges] }),
      });
      if (res.ok) {
        setNudgeSent(true);
        setSelectedNudges(new Set());
        setTimeout(() => setNudgeSent(false), 4000);
        await fetchData();
      }
    } finally { setSendingNudge(false); }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const totalDrivers = drivers.length;
  const activatedDrivers = drivers.filter(d => d.enrolments.some(e => e.link_activated)).length;
  const certifiedDrivers = drivers.filter(d => d.enrolments.some(e => e.certified)).length;
  const pendingQuotes = quotes.filter(q => q.status === "pending").length;

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      {/* Campaign Setup Modal */}
      {showCampaignModal && pendingDeployQuoteId && (
        <CampaignSetupModal
          quoteId={pendingDeployQuoteId}
          enrolmentIds={pendingEnrolmentIds}
          onClose={() => { setShowCampaignModal(false); setPendingDeployQuoteId(null); }}
          onCreated={(id) => {
            setCampaignCreated(id);
            setShowCampaignModal(false);
            setPendingDeployQuoteId(null);
            setTimeout(() => setCampaignCreated(null), 6000);
          }}
        />
      )}
      <div style={{ background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "2rem 0" }}>
        <div className="container-gfa" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span className="pill-badge pill-green" style={{ marginBottom: "0.75rem", display: "inline-flex" }}>Company Dashboard</span>
            <h1 style={{ fontSize: "1.5rem", margin: 0 }}>{companyName || "Your Company"}</h1>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button onClick={fetchData} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", padding: "0.5rem", color: "#6b7280", cursor: "pointer" }}>
              <RefreshCw size={16} />
            </button>
            <Link href="/dashboard/import" style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "#22c55e", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none" }}>
              <Upload size={14} /> Import Drivers
            </Link>
            <Link href="/dashboard/bulletins" style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "#f59e0b", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none" }}>
              <Bell size={14} /> Driver Bulletins
            </Link>
            <Link href="/dashboard/training-campaigns" style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "#4ade80", fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none" }}>
              <Target size={14} /> Training Campaigns
            </Link>
            <Link href="/dashboard/campaigns" style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "#9ca3af", fontSize: "0.8125rem", textDecoration: "none" }}>
              <BarChart3 size={14} /> Bulletin Campaigns
            </Link>
            <Link href="/dashboard/cpd-library" style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "#9ca3af", fontSize: "0.8125rem", textDecoration: "none" }}>
              <BookOpen size={14} /> CPD Library
            </Link>
            <Link href="/dashboard/reports" style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "#9ca3af", fontSize: "0.8125rem", textDecoration: "none" }}>
              <BarChart3 size={14} /> Reports
            </Link>
            <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "transparent", border: "none", color: "#6b7280", fontSize: "0.8125rem", cursor: "pointer" }}>
              <LogOut size={14} /> Log out
            </button>
          </div>
        </div>
      </div>

      <div className="container-gfa" style={{ padding: "2.5rem 0 4rem" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280" }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 1rem", display: "block" }} />
            Loading your dashboard...
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
              {[
                { label: "Total Drivers", value: totalDrivers, Icon: Users, color: "#3b82f6" },
                { label: "Link Activated", value: activatedDrivers, Icon: Zap, color: "#f59e0b" },
                { label: "Certified", value: certifiedDrivers, Icon: Award, color: "#22c55e" },
                { label: "Pending Quotes", value: pendingQuotes, Icon: FileText, color: "#8b5cf6" },
              ].map(m => (
                <div key={m.label} style={{ background: "#0d1520", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.875rem", padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div style={{ background: m.color + "15", borderRadius: "0.5rem", padding: "0.5rem", color: m.color }}><m.Icon size={18} /></div>
                    <span style={{ color: "#6b7280", fontSize: "0.8125rem" }}>{m.label}</span>
                  </div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f9fafb" }}>{m.value}</div>
                </div>
              ))}
            </div>

            {quoteSent && (
              <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "0.875rem", padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", color: "#22c55e" }}>
                <CheckCircle2 size={18} />
                <span>Quote emailed to you. Once payment is made, click <strong>Confirm Payment</strong> below, then <strong>Deploy Training</strong>.</span>
              </div>
            )}
            {nudgeSent && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "0.875rem", padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", color: "#f59e0b" }}>
                <Bell size={17} /> Reminder messages sent successfully.
              </div>
            )}
            {campaignCreated && (
              <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "0.875rem", padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", color: "#22c55e" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><CheckCircle2 size={17} /> Training campaign created. Track progress and send escalation nudges from the <strong>Training Campaigns</strong> page.</span>
                <Link href="/dashboard/training-campaigns" style={{ color: "#4ade80", fontWeight: 700, fontSize: "0.8125rem", textDecoration: "none", whiteSpace: "nowrap" }}>View Campaigns →</Link>
              </div>
            )}

            {/* ── Training Matrix ─────────────────────────────────────────── */}
            <div style={{ marginBottom: "3rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.125rem", color: "#f9fafb" }}>Training Matrix</h2>
                  <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
                    Tick <strong style={{ color: "#9ca3af" }}>Enrol</strong> for each driver and programme, then click <strong style={{ color: "#22c55e" }}>Get Quote</strong>.
                    Tick <strong style={{ color: "#f59e0b" }}>Nudge</strong> to queue a reminder, then click <strong style={{ color: "#f59e0b" }}>Send Reminders</strong>.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
                  {selectedNudges.size > 0 && (
                    <button onClick={handleSendNudges} disabled={sendingNudge} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "0.625rem", padding: "0.625rem 1.25rem", color: "#f59e0b", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
                      {sendingNudge ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                      Send Reminders ({selectedNudges.size})
                    </button>
                  )}
                  {totalSelected > 0 && (
                    <button onClick={handleGetQuote} disabled={quoting} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#22c55e", color: "#000", border: "none", borderRadius: "0.625rem", padding: "0.625rem 1.25rem", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
                      {quoting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                      Get Quote ({totalSelected})
                    </button>
                  )}
                </div>
              </div>

              {drivers.length === 0 ? (
                <div style={{ background: "#0d1520", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "0.875rem", padding: "3rem", textAlign: "center", color: "#4b5563" }}>
                  <Users size={36} style={{ margin: "0 auto 1rem", display: "block" }} />
                  <p style={{ margin: 0 }}>No drivers yet. <Link href="/dashboard/import" style={{ color: "#22c55e" }}>Import your driver list</Link> to get started.</p>
                </div>
              ) : courses.length === 0 ? (
                <div style={{ background: "#0d1520", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "0.875rem", padding: "3rem", textAlign: "center", color: "#4b5563" }}>
                  <BookOpen size={36} style={{ margin: "0 auto 1rem", display: "block" }} />
                  <p style={{ margin: 0 }}>No active programmes available. Contact GFA to set up your training programmes.</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", background: "#0d1520", borderRadius: "0.875rem", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", minWidth: `${280 + courses.length * 300}px` }}>
                    <thead>
                      {/* Programme name spanning row */}
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.15)" }}>
                        <th colSpan={2} style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#4b5563", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Driver</th>
                        {courses.map(c => (
                          <th key={c.id} colSpan={5} style={{ padding: "0.625rem 0.5rem", textAlign: "center", color: "#f9fafb", fontSize: "0.75rem", fontWeight: 700, borderLeft: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>
                            {c.name}
                          </th>
                        ))}
                        <th style={{ padding: "0.625rem 0.5rem", borderLeft: "1px solid rgba(255,255,255,0.06)" }} />
                      </tr>
                      {/* Sub-column headers */}
                      <tr style={{ borderBottom: "2px solid rgba(255,255,255,0.08)" }}>
                        <th style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#6b7280", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>Name</th>
                        <th style={{ padding: "0.625rem 1rem", textAlign: "left", color: "#6b7280", fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact</th>
                        {courses.map(c => (
                          <>
                            <th key={`${c.id}-e`} style={{ padding: "0.5rem 0.375rem", textAlign: "center", color: "#22c55e", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                              <div>Enrol</div>
                              <button onClick={() => selectAllForCourse(c.id)} style={{ marginTop: "0.2rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "0.2rem", padding: "0.1rem 0.3rem", color: "#22c55e", fontSize: "0.5rem", cursor: "pointer", fontWeight: 600 }}>All</button>
                            </th>
                            <th key={`${c.id}-l`} style={{ padding: "0.5rem 0.375rem", textAlign: "center", color: "#60a5fa", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>Link<br/>Active</th>
                            <th key={`${c.id}-p`} style={{ padding: "0.5rem 0.375rem", textAlign: "center", color: "#f59e0b", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>Progress</th>
                            <th key={`${c.id}-c`} style={{ padding: "0.5rem 0.375rem", textAlign: "center", color: "#a78bfa", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Certified</th>
                            <th key={`${c.id}-n`} style={{ padding: "0.5rem 0.375rem", textAlign: "center", color: "#f59e0b", fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Nudge</th>
                          </>
                        ))}
                        <th style={{ padding: "0.5rem 0.5rem", textAlign: "center", color: "#6b7280", fontSize: "0.5625rem", fontWeight: 600, borderLeft: "1px solid rgba(255,255,255,0.06)" }}>Enrol<br/>All</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drivers.map((driver, i) => {
                        const selected = selectedEnrolments[driver.id] ?? new Set<string>();
                        return (
                          <tr key={driver.id} style={{ borderBottom: i < drivers.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                            <td style={{ padding: "0.875rem 1rem", whiteSpace: "nowrap" }}>
                              <div style={{ fontWeight: 600, color: "#f9fafb", fontSize: "0.875rem" }}>{driver.first_name} {driver.last_name}</div>
                              {driver.branch && <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>{driver.branch}</div>}
                            </td>
                            <td style={{ padding: "0.875rem 1rem" }}>
                              <div style={{ color: "#9ca3af", fontSize: "0.8125rem" }}>{driver.mobile}</div>
                            </td>
                            {courses.map(c => {
                              const enrolment = driver.enrolments.find(e => e.course_id === c.id);
                              const isEnrolled = !!enrolment;
                              const isSelected = selected.has(c.id);
                              const moduleTotal = c.module_count || 12;
                              return (
                                <>
                                  {/* Enrol */}
                                  <td key={`${driver.id}-${c.id}-e`} style={{ padding: "0.75rem 0.375rem", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.04)" }}>
                                    {isEnrolled
                                      ? <StatusBadge status={enrolment.status} />
                                      : <input type="checkbox" checked={isSelected} onChange={() => toggleEnrol(driver.id, c.id)} style={{ width: "15px", height: "15px", cursor: "pointer", accentColor: "#22c55e" }} />}
                                  </td>
                                  {/* Link Activated */}
                                  <td key={`${driver.id}-${c.id}-l`} style={{ padding: "0.75rem 0.375rem", textAlign: "center" }}>
                                    {isEnrolled && enrolment.link_activated
                                      ? <CheckCircle2 size={15} style={{ color: "#22c55e", margin: "0 auto", display: "block" }} />
                                      : <span style={{ color: "#1f2937", fontSize: "0.75rem" }}>—</span>}
                                  </td>
                                  {/* Progress */}
                                  <td key={`${driver.id}-${c.id}-p`} style={{ padding: "0.75rem 0.375rem", textAlign: "center" }}>
                                    {isEnrolled
                                      ? <ProgressBar done={enrolment.progress_modules || 0} total={moduleTotal} />
                                      : <span style={{ color: "#1f2937", fontSize: "0.75rem" }}>—</span>}
                                  </td>
                                  {/* Certified */}
                                  <td key={`${driver.id}-${c.id}-c`} style={{ padding: "0.75rem 0.375rem", textAlign: "center" }}>
                                    {isEnrolled && enrolment.certified
                                      ? <Award size={15} style={{ color: "#a78bfa", margin: "0 auto", display: "block" }} />
                                      : <span style={{ color: "#1f2937", fontSize: "0.75rem" }}>—</span>}
                                  </td>
                                  {/* Nudge */}
                                  <td key={`${driver.id}-${c.id}-n`} style={{ padding: "0.75rem 0.375rem", textAlign: "center" }}>
                                    {isEnrolled && !enrolment.certified
                                      ? <input type="checkbox" checked={selectedNudges.has(enrolment.id)} onChange={() => toggleNudge(enrolment.id)} style={{ width: "15px", height: "15px", cursor: "pointer", accentColor: "#f59e0b" }} />
                                      : <span style={{ color: "#1f2937", fontSize: "0.75rem" }}>—</span>}
                                  </td>
                                </>
                              );
                            })}
                            {/* Enrol All */}
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.04)" }}>
                              <button onClick={() => selectAllForDriver(driver.id)} style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "0.375rem", padding: "0.25rem 0.5rem", color: "#22c55e", fontSize: "0.6875rem", cursor: "pointer", fontWeight: 600 }}>All</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem", color: "#f9fafb" }}>Deployment</h2>
              <p style={{ margin: "0 0 1.25rem", color: "#6b7280", fontSize: "0.875rem" }}>Confirm payment, then deploy training to send WhatsApp welcome messages to each driver.</p>
              {quotes.length === 0 ? (
                <div style={{ background: "#0d1520", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "0.875rem", padding: "2.5rem", textAlign: "center", color: "#4b5563" }}>
                  <FileText size={32} style={{ margin: "0 auto 0.75rem", display: "block" }} />
                  No quotes yet. Select courses above and click Get Quote.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {quotes.map(quote => (
                    <div key={quote.id} style={{ background: "#0d1520", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.875rem", padding: "1.25rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.375rem" }}>
                            <span style={{ fontWeight: 700, color: "#f9fafb" }}>Ref: {quote.reference}</span>
                            <StatusBadge status={quote.status} />
                          </div>
                          <div style={{ color: "#6b7280", fontSize: "0.8125rem" }}>
                            {quote.line_items?.length ?? 0} enrolments · R {quote.total?.toFixed(2)} incl. VAT · {new Date(quote.created_at).toLocaleDateString("en-ZA")}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.625rem" }}>
                          {quote.status === "pending" && (
                            <button onClick={() => handleConfirmPayment(quote.id)} disabled={confirmingPayment === quote.id} style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "0.5rem", padding: "0.5rem 0.875rem", color: "#60a5fa", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}>
                              {confirmingPayment === quote.id ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
                              Confirm Payment
                            </button>
                          )}
                          {quote.status === "paid" && !quote.deployed_at && (
                            <button onClick={() => handleDeploy(quote.id)} disabled={deploying === quote.id} style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "#22c55e", border: "none", borderRadius: "0.5rem", padding: "0.5rem 0.875rem", color: "#000", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}>
                              {deploying === quote.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                              Deploy Training
                            </button>
                          )}
                          {quote.status === "deployed" && (
                            <span style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#22c55e", fontSize: "0.8125rem", fontWeight: 600 }}>
                              <CheckCircle2 size={14} /> Deployed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
