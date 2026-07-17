"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export default function AddCompanyForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ name: string; tempPassword?: string } | null>(null);

  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fleetSize, setFleetSize] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"full" | "trial">("full");
  const [sendWelcome, setSendWelcome] = useState(true);

  function resetForm() {
    setCompanyName("");
    setContactName("");
    setEmail("");
    setPhone("");
    setFleetSize("");
    setPassword("");
    setAccountType("full");
    setSendWelcome(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          email,
          phone,
          fleetSize: fleetSize || undefined,
          password: password || undefined,
          accountType,
          sendWelcome,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create company");
        return;
      }
      setSuccess({ name: data.company.name, tempPassword: data.tempPassword });
      resetForm();
      router.refresh();
      onCreated?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setSuccess(null);
    setError("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-[#2ecc71] hover:bg-[#27ae60] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <Plus size={16} />
        Add Company
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative bg-[#111f3a] border border-slate-700/50 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
              <h2 className="text-white font-semibold text-lg">Add New Company</h2>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Success state */}
            {success ? (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 size={24} className="text-[#2ecc71]" />
                  <span className="text-white font-medium">Company created successfully</span>
                </div>
                <p className="text-slate-300 text-sm mb-2">
                  <strong className="text-white">{success.name}</strong> has been added to the platform.
                </p>
                {success.tempPassword && (
                  <div className="bg-[#0a1628] border border-amber-500/30 rounded-lg p-4 mt-4">
                    <p className="text-amber-400 text-xs font-medium mb-1">Temporary password (send to client):</p>
                    <p className="text-white font-mono text-sm">{success.tempPassword}</p>
                  </div>
                )}
                <button
                  onClick={handleClose}
                  className="w-full mt-6 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                    <AlertTriangle size={16} className="flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Company Name */}
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-[#0a1628] border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2ecc71]"
                    placeholder="Acme Logistics"
                  />
                </div>

                {/* Contact Name */}
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-[#0a1628] border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2ecc71]"
                    placeholder="Jane Smith"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0a1628] border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2ecc71]"
                    placeholder="jane@acme.co.za"
                  />
                </div>

                {/* Phone + Fleet Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#0a1628] border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2ecc71]"
                      placeholder="082 123 4567"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1.5">
                      Fleet Size
                    </label>
                    <input
                      type="text"
                      value={fleetSize}
                      onChange={(e) => setFleetSize(e.target.value)}
                      className="w-full bg-[#0a1628] border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2ecc71]"
                      placeholder="50"
                    />
                  </div>
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">
                    Account Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAccountType("full")}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        accountType === "full"
                          ? "bg-[#2ecc71]/20 text-[#2ecc71] border border-[#2ecc71]/50"
                          : "bg-[#0a1628] text-slate-400 border border-slate-700/50"
                      }`}
                    >
                      Full Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType("trial")}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        accountType === "trial"
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                          : "bg-[#0a1628] text-slate-400 border border-slate-700/50"
                      }`}
                    >
                      Trial Account
                    </button>
                  </div>
                </div>

                {/* Password (optional) */}
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">
                    Password{" "}
                    <span className="text-slate-600">(leave blank to auto-generate)</span>
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0a1628] border border-slate-700/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#2ecc71]"
                    placeholder="Auto-generated if empty"
                  />
                </div>

                {/* Send welcome email */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendWelcome}
                    onChange={(e) => setSendWelcome(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#2ecc71]"
                  />
                  <span className="text-slate-300 text-sm">
                    Send welcome email{!password && " with temporary password"}
                  </span>
                </label>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-[#2ecc71] hover:bg-[#27ae60] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Company"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
