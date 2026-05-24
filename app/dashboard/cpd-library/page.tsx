"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";

const CATEGORIES = [
  "All", "safety", "quality", "process", "operational", "compliance", "behaviour", "other"
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  submitted: { label: "Submitted", color: "bg-blue-500/20 text-blue-400" },
  under_review: { label: "Under review", color: "bg-amber-500/20 text-amber-400" },
  selected_for_cpd: { label: "Selected for CPD", color: "bg-[#22c55e]/20 text-[#4ade80]" },
  developed_into_module: { label: "Developed into module", color: "bg-emerald-500/20 text-emerald-300" },
  archived: { label: "Archived", color: "bg-gray-500/20 text-gray-400" },
};

interface LibraryEntry {
  id: string;
  title: string;
  category: string;
  description: string;
  why_relevant: string;
  source_company_name: string | null;
  shared_anonymously: boolean;
  status: string;
  vote_count: number;
  created_at: string;
}

export default function CPDLibraryPage() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const params = filter !== "All" ? `?category=${filter}` : "";
    fetch(`/api/bulletins/cpd-library${params}`)
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.entries || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-[#4ade80] mb-1">CPD Intelligence</div>
          <h1 className="text-3xl font-bold text-white">CPD Library</h1>
          <p className="text-gray-400 mt-1 max-w-xl">
            Topics contributed by GFA client companies for future quarterly CPD module development. Each topic represents a real operational issue from the field.
          </p>
        </div>
        <Link
          href="/dashboard/bulletins"
          className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          + Contribute topic
        </Link>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${filter === cat ? "bg-[#22c55e] text-white" : "bg-[#1a3a22] text-gray-300 hover:bg-[#22c55e]/20"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No CPD library entries yet</p>
          <p className="text-sm">When you contribute a topic via a bulletin, it will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {entries.map((entry) => {
            const statusInfo = STATUS_LABELS[entry.status] || STATUS_LABELS.submitted;
            return (
              <div key={entry.id} className="bg-[#0d1a0d] border border-[#1a3a22] rounded-2xl p-5 hover:border-[#22c55e]/40 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs bg-[#1a3a22] text-gray-300 px-2 py-0.5 rounded-full capitalize">{entry.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>
                    <h3 className="text-white font-semibold text-base">{entry.title}</h3>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="text-xs text-gray-500">
                      {new Date(entry.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    {entry.source_company_name && (
                      <div className="text-xs text-gray-600 mt-0.5">
                        {entry.shared_anonymously ? "Anonymous" : entry.source_company_name}
                      </div>
                    )}
                  </div>
                </div>

                {entry.description && (
                  <p className="text-gray-400 text-sm mb-2">{entry.description}</p>
                )}

                {entry.why_relevant && (
                  <div className="bg-[#0a150a] border border-[#1a3a22] rounded-lg px-3 py-2 mt-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Why relevant</span>
                    <p className="text-gray-300 text-sm mt-0.5">{entry.why_relevant}</p>
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
