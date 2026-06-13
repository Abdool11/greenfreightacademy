"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CampaignStat {
  total_targeted: number;
  total_delivered: number;
  total_opened: number;
  total_acknowledged: number;
  total_check_completed: number;
  total_feedback: number;
  acknowledgement_rate: number;
  understanding_completion_rate: number;
  avg_understanding_score: number | null;
}

interface Campaign {
  id: string;
  bulletin_id: string;
  disseminated_at: string;
  bulletins: {
    id: string;
    title: string;
    category: string;
    urgency: string;
    distribution: string;
    status: string;
    sla_deadline: string | null;
  };
  live_stats: CampaignStat;
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{value} <span className="text-gray-500">({pct}%)</span></span>
      </div>
      <div className="h-1.5 bg-[#1a3a22] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/bulletins/campaign")
      .then((r) => r.json())
      .then((d) => {
        setCampaigns(d.campaigns || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const exportReport = async (campaign: Campaign) => {
    setExporting(true);
    const rows = [
      ["Bulletin", campaign.bulletins.title],
      ["Category", campaign.bulletins.category],
      ["Urgency", campaign.bulletins.urgency],
      ["Disseminated", new Date(campaign.disseminated_at).toLocaleString()],
      [""],
      ["Metric", "Count", "Rate"],
      ["Targeted", campaign.live_stats.total_targeted, "100%"],
      ["Delivered", campaign.live_stats.total_delivered, `${Math.round((campaign.live_stats.total_delivered / campaign.live_stats.total_targeted) * 100)}%`],
      ["Opened", campaign.live_stats.total_opened, `${Math.round((campaign.live_stats.total_opened / campaign.live_stats.total_delivered) * 100)}%`],
      ["Acknowledged", campaign.live_stats.total_acknowledged, `${campaign.live_stats.acknowledgement_rate}%`],
      ["Check completed", campaign.live_stats.total_check_completed, `${campaign.live_stats.understanding_completion_rate}%`],
      ["Feedback submitted", campaign.live_stats.total_feedback, ""],
      ["Avg understanding score", campaign.live_stats.avg_understanding_score ?? "N/A", ""],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-report-${campaign.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-[#4ade80] mb-1">Campaign Reporting</div>
          <h1 className="text-3xl font-bold text-white">Bulletin campaigns</h1>
          <p className="text-gray-400 mt-1">Track reach, acknowledgement, and understanding across all disseminated bulletins.</p>
        </div>
        <Link
          href="/dashboard/bulletins"
          className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          + New bulletin
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No campaigns yet</p>
          <p className="text-sm">Submit and disseminate a bulletin to see campaign reports here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map((c) => {
            const s = c.live_stats;
            const isUrgent = c.bulletins.urgency === "urgent";
            const slaPassed = c.bulletins.sla_deadline && new Date(c.bulletins.sla_deadline) < new Date();
            return (
              <div
                key={c.id}
                className={`bg-[#0d1a0d] border rounded-2xl p-6 cursor-pointer transition-all hover:border-[#22c55e]/50 ${selected?.id === c.id ? "border-[#22c55e]" : "border-[#1a3a22]"}`}
                onClick={() => setSelected(selected?.id === c.id ? null : c)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {isUrgent && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${slaPassed ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
                          {slaPassed ? "SLA overdue" : "Urgent"}
                        </span>
                      )}
                      <span className="text-xs bg-[#1a3a22] text-gray-300 px-2 py-0.5 rounded-full capitalize">{c.bulletins.category}</span>
                    </div>
                    <h3 className="text-white font-semibold text-lg truncate">{c.bulletins.title}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Disseminated {new Date(c.disseminated_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#4ade80]">{s.acknowledgement_rate}%</div>
                      <div className="text-xs text-gray-500">acknowledged</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); exportReport(c); }}
                      disabled={exporting}
                      className="border border-[#1a3a22] hover:border-[#22c55e] text-gray-400 hover:text-white p-2 rounded-lg transition-colors"
                      title="Export CSV report"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Summary stats row */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Targeted", value: s.total_targeted, color: "text-gray-300" },
                    { label: "Delivered", value: s.total_delivered, color: "text-blue-400" },
                    { label: "Acknowledged", value: s.total_acknowledged, color: "text-[#4ade80]" },
                    { label: "Check done", value: s.total_check_completed, color: "text-emerald-300" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-[#0a150a] rounded-xl p-3 text-center">
                      <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Expanded detail */}
                {selected?.id === c.id && (
                  <div className="border-t border-[#1a3a22] pt-4 mt-2 space-y-3">
                    <StatBar label="Opened" value={s.total_opened} max={s.total_delivered} color="bg-blue-500" />
                    <StatBar label="Acknowledged" value={s.total_acknowledged} max={s.total_delivered} color="bg-[#22c55e]" />
                    <StatBar label="Understanding check completed" value={s.total_check_completed} max={s.total_delivered} color="bg-emerald-400" />
                    <StatBar label="Feedback submitted" value={s.total_feedback} max={s.total_delivered} color="bg-purple-400" />
                    {s.avg_understanding_score !== null && (
                      <div className="flex justify-between text-sm pt-1">
                        <span className="text-gray-400">Average understanding score</span>
                        <span className={`font-bold ${s.avg_understanding_score >= 80 ? "text-[#4ade80]" : s.avg_understanding_score >= 60 ? "text-amber-400" : "text-red-400"}`}>
                          {s.avg_understanding_score}%
                        </span>
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
