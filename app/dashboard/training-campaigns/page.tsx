"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users, CheckCircle2, Clock, AlertCircle, Loader2,
  Bell, XCircle, ChevronDown, ChevronUp, Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutstandingEnrolment {
  id: string;
  status: string;
  progress_percent: number;
  link_activated: boolean;
  nudge_sent_at: string | null;
  drivers: { id: string; first_name: string; last_name: string; mobile: string } | null;
  courses: { id: string; name: string } | null;
}

interface CampaignStats {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  outstanding: OutstandingEnrolment[];
  avgFeedback: {
    understanding: number;
    enjoyment: number;
    more_learning: number;
    count: number;
  } | null;
}

interface Campaign {
  id: string;
  name: string;
  duration_days: number;
  start_date: string;
  end_date: string;
  status: "active" | "closed" | "draft";
  closed_at: string | null;
  refunded_credits: number;
  created_at: string;
  stats: CampaignStats;
  daysRemaining: number | null;
  daysElapsed: number;
  progressPct: number;
}

// ─── Star Rating Display ──────────────────────────────────────────────────────
function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < Math.round(value) ? "text-amber-400 fill-amber-400" : "text-gray-600"}
        />
      ))}
      <span className="ml-1 text-xs text-gray-400">{value.toFixed(1)}</span>
    </span>
  );
}

// ─── Time Progress Bar ────────────────────────────────────────────────────────
function TimeBar({ pct, daysRemaining, status }: { pct: number; daysRemaining: number | null; status: string }) {
  const color = status === "closed" ? "bg-gray-600" : pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-[#22c55e]";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">Campaign duration</span>
        <span className={status === "closed" ? "text-gray-500" : daysRemaining === 0 ? "text-red-400 font-semibold" : "text-gray-300"}>
          {status === "closed" ? "Closed" : daysRemaining !== null ? `${daysRemaining}d remaining` : ""}
        </span>
      </div>
      <div className="h-2 bg-[#1a3a22] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#0a150a] rounded-xl p-3 text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TrainingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [nudging, setNudging] = useState<string | null>(null);
  const [nudgeSent, setNudgeSent] = useState<string | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const [closedResult, setClosedResult] = useState<{ id: string; refunded: number } | null>(null);
  const [selectedNudges, setSelectedNudges] = useState<Record<string, Set<string>>>({});

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/company/training-campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const toggleExpand = (id: string) => setExpanded(expanded === id ? null : id);

  const toggleNudge = (campaignId: string, enrolmentId: string) => {
    setSelectedNudges(prev => {
      const next = { ...prev };
      const set = new Set(next[campaignId] ?? []);
      if (set.has(enrolmentId)) set.delete(enrolmentId); else set.add(enrolmentId);
      next[campaignId] = set;
      return next;
    });
  };

  const selectAllNudges = (campaignId: string, outstanding: OutstandingEnrolment[]) => {
    setSelectedNudges(prev => ({
      ...prev,
      [campaignId]: new Set(outstanding.map(e => e.id)),
    }));
  };

  const handleNudge = async (campaignId: string) => {
    const ids = [...(selectedNudges[campaignId] ?? [])];
    if (ids.length === 0) return;
    setNudging(campaignId);
    try {
      const res = await fetch("/api/company/training-campaigns/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, enrolment_ids: ids }),
      });
      if (res.ok) {
        setNudgeSent(campaignId);
        setSelectedNudges(prev => ({ ...prev, [campaignId]: new Set() }));
        setTimeout(() => setNudgeSent(null), 4000);
        await fetchCampaigns();
      }
    } finally {
      setNudging(null);
    }
  };

  const handleClose = async (campaignId: string) => {
    if (!confirm("Close this campaign? Outstanding enrolments will be marked expired and fees refunded as credits.")) return;
    setClosing(campaignId);
    try {
      const res = await fetch("/api/company/training-campaigns/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      if (res.ok) {
        const data = await res.json();
        setClosedResult({ id: campaignId, refunded: data.refunded_credits });
        await fetchCampaigns();
      }
    } finally {
      setClosing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-[#4ade80] mb-1">Training Campaigns</div>
          <h1 className="text-3xl font-bold text-white">Campaign Management</h1>
          <p className="text-gray-400 mt-1">
            Track progress, send escalation nudges, and close campaigns with credit refunds for outstanding candidates.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="bg-[#0d1a0d] border border-[#1a3a22] hover:border-[#22c55e] text-gray-300 hover:text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Closed result banner */}
      {closedResult && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 text-emerald-300">
          <CheckCircle2 size={18} />
          <span>
            Campaign closed.{" "}
            {closedResult.refunded > 0
              ? `R ${closedResult.refunded.toFixed(2)} has been refunded to your credit balance.`
              : "No outstanding enrolments — no credits refunded."}
          </span>
          <button onClick={() => setClosedResult(null)} className="ml-auto text-emerald-500 hover:text-white">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Users size={40} className="mx-auto mb-4 text-gray-700" />
          <p className="text-lg mb-2">No training campaigns yet</p>
          <p className="text-sm mb-6">
            When you deploy training from the dashboard, you can create a campaign with a target duration to track progress here.
          </p>
          <Link
            href="/dashboard"
            className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {campaigns.map((c) => {
            const s = c.stats;
            const isExpanded = expanded === c.id;
            const campaignNudges = selectedNudges[c.id] ?? new Set<string>();
            const completionPct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;

            return (
              <div
                key={c.id}
                className={`bg-[#0d1a0d] border rounded-2xl p-6 transition-all ${
                  c.status === "closed" ? "border-[#1a3a22] opacity-75" : "border-[#1a3a22] hover:border-[#22c55e]/40"
                }`}
              >
                {/* Campaign header */}
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        c.status === "active" ? "bg-emerald-500/20 text-emerald-400" :
                        c.status === "closed" ? "bg-gray-700 text-gray-400" :
                        "bg-blue-500/20 text-blue-400"
                      }`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                      <span className="text-xs bg-[#1a3a22] text-gray-400 px-2 py-0.5 rounded-full">
                        {c.duration_days}d campaign
                      </span>
                      {c.daysRemaining === 0 && c.status === "active" && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-semibold">
                          Deadline reached
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-bold text-lg truncate">{c.name}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Started {new Date(c.start_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                      {c.end_date && ` · Ends ${new Date(c.end_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#4ade80]">{completionPct}%</div>
                      <div className="text-xs text-gray-500">complete</div>
                    </div>
                    <button
                      onClick={() => toggleExpand(c.id)}
                      className="border border-[#1a3a22] hover:border-[#22c55e] text-gray-400 hover:text-white p-2 rounded-lg transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Time progress bar */}
                <div className="mb-4">
                  <TimeBar pct={c.progressPct} daysRemaining={c.daysRemaining} status={c.status} />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <StatPill label="Enrolled" value={s.total} color="text-gray-300" />
                  <StatPill label="Not Started" value={s.notStarted} color="text-red-400" />
                  <StatPill label="In Progress" value={s.inProgress} color="text-amber-400" />
                  <StatPill label="Completed" value={s.completed} color="text-[#4ade80]" />
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[#1a3a22] pt-5 mt-2 space-y-5">

                    {/* HR Feedback summary */}
                    {s.avgFeedback && (
                      <div className="bg-[#0a150a] rounded-xl p-4">
                        <div className="text-xs font-semibold uppercase tracking-widest text-[#4ade80] mb-3">
                          HR Feedback — {s.avgFeedback.count} response{s.avgFeedback.count !== 1 ? "s" : ""}
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {[
                            { label: "I understand the material", value: s.avgFeedback.understanding },
                            { label: "I enjoyed the learning experience", value: s.avgFeedback.enjoyment },
                            { label: "I want to learn more", value: s.avgFeedback.more_learning },
                          ].map((q) => (
                            <div key={q.label} className="flex flex-col gap-1">
                              <span className="text-xs text-gray-400">{q.label}</span>
                              <StarRating value={q.value} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Outstanding candidates */}
                    {s.outstanding.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <div className="text-sm font-semibold text-white flex items-center gap-2">
                            <AlertCircle size={15} className="text-amber-400" />
                            Outstanding Candidates ({s.outstanding.length})
                          </div>
                          {c.status === "active" && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => selectAllNudges(c.id, s.outstanding)}
                                className="text-xs border border-[#1a3a22] hover:border-amber-500/40 text-gray-400 hover:text-amber-300 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Select All
                              </button>
                              {campaignNudges.size > 0 && (
                                <button
                                  onClick={() => handleNudge(c.id)}
                                  disabled={nudging === c.id}
                                  className="flex items-center gap-1.5 text-xs bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 text-amber-300 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                                >
                                  {nudging === c.id ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                                  Nudge ({campaignNudges.size})
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {nudgeSent === c.id && (
                          <div className="mb-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-300 text-xs flex items-center gap-2">
                            <Bell size={13} /> Escalation nudges sent successfully.
                          </div>
                        )}

                        <div className="rounded-xl border border-[#1a3a22] overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-[#0a150a] border-b border-[#1a3a22]">
                                {c.status === "active" && <th className="p-3 text-left w-8" />}
                                <th className="p-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">Driver</th>
                                <th className="p-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">Programme</th>
                                <th className="p-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">Status</th>
                                <th className="p-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">Progress</th>
                                <th className="p-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">Last Nudge</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.outstanding.map((e, i) => {
                                const driver = e.drivers;
                                const course = e.courses;
                                const isNotStarted = !e.link_activated;
                                return (
                                  <tr
                                    key={e.id}
                                    className={`border-b border-[#1a3a22] last:border-0 ${
                                      campaignNudges.has(e.id) ? "bg-amber-500/5" : i % 2 === 0 ? "bg-transparent" : "bg-[#0a150a]/50"
                                    }`}
                                  >
                                    {c.status === "active" && (
                                      <td className="p-3">
                                        <input
                                          type="checkbox"
                                          checked={campaignNudges.has(e.id)}
                                          onChange={() => toggleNudge(c.id, e.id)}
                                          className="w-3.5 h-3.5 cursor-pointer accent-amber-400"
                                        />
                                      </td>
                                    )}
                                    <td className="p-3">
                                      <div className="font-medium text-white text-sm">
                                        {driver ? `${driver.first_name} ${driver.last_name}` : "—"}
                                      </div>
                                      {driver?.mobile && (
                                        <div className="text-xs text-gray-500">{driver.mobile}</div>
                                      )}
                                    </td>
                                    <td className="p-3 text-gray-300 text-sm">{course?.name ?? "—"}</td>
                                    <td className="p-3">
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        isNotStarted ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                                      }`}>
                                        {isNotStarted ? "Not started" : "In progress"}
                                      </span>
                                    </td>
                                    <td className="p-3 text-gray-400 text-sm">{e.progress_percent ?? 0}%</td>
                                    <td className="p-3 text-gray-500 text-xs">
                                      {e.nudge_sent_at
                                        ? new Date(e.nudge_sent_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })
                                        : "Never"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm">
                        <CheckCircle2 size={16} /> All enrolled candidates have completed this campaign.
                      </div>
                    )}

                    {/* Close campaign */}
                    {c.status === "active" && (
                      <div className="flex items-center justify-between pt-2 border-t border-[#1a3a22]">
                        <div>
                          <p className="text-sm text-gray-300 font-medium">Close Campaign</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Outstanding enrolments will be expired. Fees for non-starters (100%) and in-progress drivers (50%) will be refunded as credits.
                          </p>
                        </div>
                        <button
                          onClick={() => handleClose(c.id)}
                          disabled={closing === c.id}
                          className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 hover:border-red-400 text-red-400 hover:text-red-300 font-semibold px-4 py-2 rounded-xl transition-colors text-sm ml-4 shrink-0"
                        >
                          {closing === c.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                          Close Campaign
                        </button>
                      </div>
                    )}

                    {/* Closed summary */}
                    {c.status === "closed" && c.refunded_credits > 0 && (
                      <div className="flex items-center gap-2 text-gray-400 text-sm pt-2 border-t border-[#1a3a22]">
                        <Clock size={14} />
                        Closed {c.closed_at ? new Date(c.closed_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : ""} ·{" "}
                        <span className="text-emerald-400 font-medium">R {c.refunded_credits.toFixed(2)} credited</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
