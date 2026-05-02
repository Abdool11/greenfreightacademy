"use client";

import { useState } from "react";
import { X, Loader2, Calendar, CheckCircle2 } from "lucide-react";

interface CampaignSetupModalProps {
  quoteId: string;
  enrolmentIds: string[];
  onClose: () => void;
  onCreated: (campaignId: string) => void;
}

const DURATION_OPTIONS = [
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
  { label: "Custom", days: 0 },
];

export default function CampaignSetupModal({
  enrolmentIds,
  onClose,
  onCreated,
}: CampaignSetupModalProps) {
  const [name, setName] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [customDays, setCustomDays] = useState<string>("45");
  const [isCustom, setIsCustom] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveDays = isCustom ? parseInt(customDays, 10) || 0 : selectedDuration;

  const endDate = effectiveDays > 0
    ? new Date(Date.now() + effectiveDays * 24 * 60 * 60 * 1000).toLocaleDateString("en-ZA", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  const handleCreate = async () => {
    if (!name.trim()) { setError("Please enter a campaign name."); return; }
    if (effectiveDays < 1) { setError("Duration must be at least 1 day."); return; }
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/company/training-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          duration_days: effectiveDays,
          enrolment_ids: enrolmentIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create campaign."); return; }
      onCreated(data.campaign.id);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#0d1a0d] border border-[#1a3a22] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1a3a22]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-[#4ade80] mb-0.5">New Campaign</div>
            <h2 className="text-white font-bold text-lg">Set Campaign Duration</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Campaign name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Eco-Driving Rollout"
              className="w-full bg-[#0a150a] border border-[#1a3a22] focus:border-[#22c55e] rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm outline-none transition-colors"
            />
          </div>

          {/* Duration picker */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Duration</label>
            <div className="grid grid-cols-2 gap-2">
              {DURATION_OPTIONS.map((opt) => {
                const isSelected = opt.days === 0 ? isCustom : (!isCustom && selectedDuration === opt.days);
                return (
                  <button
                    key={opt.label}
                    onClick={() => {
                      if (opt.days === 0) {
                        setIsCustom(true);
                      } else {
                        setIsCustom(false);
                        setSelectedDuration(opt.days);
                      }
                    }}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      isSelected
                        ? "bg-[#22c55e]/10 border-[#22c55e] text-[#4ade80]"
                        : "bg-[#0a150a] border-[#1a3a22] text-gray-400 hover:border-[#22c55e]/40 hover:text-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Custom days input */}
            {isCustom && (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="w-24 bg-[#0a150a] border border-[#22c55e] rounded-xl px-3 py-2 text-white text-sm outline-none text-center"
                />
                <span className="text-gray-400 text-sm">days</span>
              </div>
            )}
          </div>

          {/* End date preview */}
          {endDate && (
            <div className="flex items-center gap-2 text-sm text-gray-400 bg-[#0a150a] rounded-xl px-4 py-3">
              <Calendar size={14} className="text-[#4ade80]" />
              <span>Campaign ends <strong className="text-white">{endDate}</strong></span>
            </div>
          )}

          {/* Enrolment count */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <CheckCircle2 size={14} className="text-[#4ade80]" />
            <span>{enrolmentIds.length} enrolment{enrolmentIds.length !== 1 ? "s" : ""} will be tracked in this campaign.</span>
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 border border-[#1a3a22] hover:border-gray-500 text-gray-400 hover:text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
          >
            Skip for now
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-1 flex items-center justify-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold py-2.5 rounded-xl transition-colors text-sm"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : null}
            Create Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
