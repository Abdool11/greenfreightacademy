"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  initialFromName: string;
  initialBookingTo: string;
  initialCompanyEmail: string;
}

export default function EmailSettingsClient({
  initialFromName,
  initialBookingTo,
  initialCompanyEmail,
}: Props) {
  const [fromName, setFromName] = useState(initialFromName);
  const [bookingTo, setBookingTo] = useState(initialBookingTo);
  const [companyEmail, setCompanyEmail] = useState(initialCompanyEmail);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_from_name: fromName,
          email_booking_to: bookingTo,
          company_email: companyEmail,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Header */}
      <div className="bg-[#0d1f3c] border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard"
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <h1 className="text-white font-semibold">Email Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Email Settings</h2>
          <p className="text-slate-400 mt-2 text-sm">
            Configure the email addresses used for system notifications and
            public contact. Changes take effect immediately — no redeployment
            required.
          </p>
        </div>

        <div className="bg-[#111f3a] border border-slate-700/50 rounded-xl p-6 space-y-6">
          {/* From Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              From Name
            </label>
            <p className="text-xs text-slate-500 mb-2">
              The name shown in the &ldquo;From&rdquo; field of all outbound emails.
            </p>
            <input
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="e.g. Green Freight Academy"
              className="w-full bg-[#0a1628] border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#2ecc71] transition-colors text-sm"
            />
          </div>

          {/* Booking Notification Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Booking &amp; Enquiry Notification Email
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Receives an email every time a company submits a booking, training
              enquiry, or contact form submission on the GFA site.
            </p>
            <input
              type="email"
              value={bookingTo}
              onChange={(e) => setBookingTo(e.target.value)}
              placeholder="e.g. bookings@greenfreightacademy.co.za"
              className="w-full bg-[#0a1628] border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#2ecc71] transition-colors text-sm"
            />
          </div>

          {/* Company Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Public Contact Email
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Displayed on the GFA website as the public contact email address.
            </p>
            <input
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              placeholder="e.g. info@greenfreightacademy.co.za"
              className="w-full bg-[#0a1628] border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#2ecc71] transition-colors text-sm"
            />
          </div>

          {/* Save button */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#2ecc71] hover:bg-[#27ae60] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
            {saved && (
              <span className="text-[#2ecc71] text-sm font-medium">
                ✓ Settings saved
              </span>
            )}
            {error && (
              <span className="text-red-400 text-sm">{error}</span>
            )}
          </div>
        </div>

        {/* Info box */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <h3 className="text-blue-300 font-medium text-sm mb-1">
            How email delivery works
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            GFA uses Resend for transactional email delivery. The &ldquo;From Name&rdquo;
            and notification addresses set here are used by the booking and
            contact form API routes. The actual sending domain must be verified
            in your Resend account settings.
          </p>
        </div>
      </div>
    </div>
  );
}
