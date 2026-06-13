"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, BookOpen, Zap, ChevronDown, ChevronUp, Image as ImageIcon } from "lucide-react";

interface CpdQueueItem {
  id: string;
  bulletin_id: string;
  company_id: string | null;
  title: string;
  category: string;
  description: string;
  why_relevant: string | null;
  source_company_name: string | null;
  shared_anonymously: boolean;
  image_urls: string[] | null;
  status: "pending_review" | "approved" | "rejected";
  is_urgent_contribution: boolean;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  bulletins: {
    id: string;
    urgency: string;
    mitigation_message: string;
    driver_action: string | null;
    date_observed: string | null;
    supporting_file_url: string | null;
  } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  road_safety: "Road Safety",
  vehicle_maintenance: "Vehicle Maintenance",
  load_security: "Load Security",
  fatigue: "Fatigue Management",
  substance_abuse: "Substance Abuse",
  hijacking: "Hijacking / Security",
  weather: "Weather / Road Conditions",
  compliance: "Compliance",
  other: "Other",
};

export default function CpdQueuePage() {
  const [items, setItems] = useState<CpdQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending_review" | "approved" | "rejected">("pending_review");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cpd-queue?status=${status}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(statusFilter); }, [statusFilter]);

  const handleAction = async (itemId: string, action: "approve" | "reject") => {
    setProcessing(itemId);
    setError(null);
    try {
      const res = await fetch("/api/admin/cpd-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, action, admin_notes: notes[itemId] || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessing(null);
    }
  };

  const pendingCount = items.filter((i) => i.status === "pending_review").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-7 h-7 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900">CPD Library Queue</h1>
          {statusFilter === "pending_review" && pendingCount > 0 && (
            <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Review bulletin submissions from client companies for inclusion in the quarterly CPD bulletin.
          Standard bulletins are submitted automatically; urgent bulletins appear here when the client opts in to waive their fee.
        </p>

        {/* Status filter tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {(["pending_review", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                statusFilter === s
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {s === "pending_review" ? "Pending Review" : s === "approved" ? "Approved" : "Rejected"}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No items in this queue</p>
            <p className="text-sm mt-1">
              {statusFilter === "pending_review"
                ? "All submissions have been reviewed."
                : `No ${statusFilter} submissions yet.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const isOpen = expanded === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Card header */}
                  <div
                    className="flex items-start gap-4 p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          {CATEGORY_LABELS[item.category] ?? item.category}
                        </span>
                        {item.is_urgent_contribution && (
                          <span className="flex items-center gap-1 bg-red-50 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                            <Zap className="w-3 h-3" /> Urgent contribution (fee waived)
                          </span>
                        )}
                        {item.shared_anonymously && (
                          <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">Anonymous</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-base leading-snug">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {item.shared_anonymously ? "Anonymous submission" : (item.source_company_name ?? "Unknown company")}
                        {" · "}
                        {new Date(item.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.image_urls && item.image_urls.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <ImageIcon className="w-3.5 h-3.5" /> {item.image_urls.length}
                        </span>
                      )}
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
                      {/* Description */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{item.description}</p>
                      </div>

                      {/* Why relevant */}
                      {item.why_relevant && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Why it matters</p>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{item.why_relevant}</p>
                        </div>
                      )}

                      {/* Mitigation */}
                      {item.bulletins?.mitigation_message && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Mitigation message</p>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{item.bulletins.mitigation_message}</p>
                        </div>
                      )}

                      {/* Images */}
                      {item.image_urls && item.image_urls.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Images</p>
                          <div className="flex gap-3 flex-wrap">
                            {item.image_urls.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={url}
                                  alt={`Bulletin image ${idx + 1}`}
                                  className="w-32 h-24 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Supporting file */}
                      {item.bulletins?.supporting_file_url && (
                        <div>
                          <a
                            href={item.bulletins.supporting_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-emerald-600 hover:underline"
                          >
                            View supporting file →
                          </a>
                        </div>
                      )}

                      {/* Admin notes (only for pending) */}
                      {statusFilter === "pending_review" && (
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400 block mb-1">
                            Admin notes (optional)
                          </label>
                          <textarea
                            value={notes[item.id] ?? ""}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Add notes for your records or to inform the company..."
                            rows={2}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                          />
                        </div>
                      )}

                      {/* Existing notes (for reviewed items) */}
                      {statusFilter !== "pending_review" && item.admin_notes && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Admin notes</p>
                          <p className="text-sm text-gray-600 italic">{item.admin_notes}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      {statusFilter === "pending_review" && (
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => handleAction(item.id, "approve")}
                            disabled={processing === item.id}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {processing === item.id ? "Processing…" : "Approve for CPD Library"}
                          </button>
                          <button
                            onClick={() => handleAction(item.id, "reject")}
                            disabled={processing === item.id}
                            className="flex items-center gap-2 bg-white border border-red-300 text-red-600 hover:bg-red-50 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      )}

                      {/* Status badge for reviewed items */}
                      {statusFilter !== "pending_review" && (
                        <div className="flex items-center gap-2 pt-2">
                          {item.status === "approved" ? (
                            <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 text-sm font-semibold px-3 py-1.5 rounded-full">
                              <CheckCircle2 className="w-4 h-4" /> Approved
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-red-600 bg-red-50 text-sm font-semibold px-3 py-1.5 rounded-full">
                              <XCircle className="w-4 h-4" /> Rejected
                            </span>
                          )}
                          {item.reviewed_at && (
                            <span className="text-xs text-gray-400">
                              {new Date(item.reviewed_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
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
    </div>
  );
}
