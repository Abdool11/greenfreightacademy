"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle, Lock } from "lucide-react";

function SetupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
        <div className="bg-[#111f3a] border border-slate-700/50 rounded-xl max-w-md w-full p-8 text-center">
          <AlertTriangle size={32} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-white font-semibold text-lg mb-2">Invalid Setup Link</h1>
          <p className="text-slate-400 text-sm mb-6">
            No setup token was provided. Please check your email for the correct link.
          </p>
          <a href="/login" className="text-[#2ecc71] text-sm hover:underline">Go to Login →</a>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to set up account");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
        <div className="bg-[#111f3a] border border-slate-700/50 rounded-xl max-w-md w-full p-8 text-center">
          <CheckCircle2 size={32} className="text-[#2ecc71] mx-auto mb-4" />
          <h1 className="text-white font-semibold text-lg mb-2">Account Set Up Successfully!</h1>
          <p className="text-slate-400 text-sm mb-4">
            Your password has been set. Redirecting to your dashboard...
          </p>
          <Loader2 size={20} className="animate-spin text-[#2ecc71] mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
      <div className="bg-[#111f3a] border border-slate-700/50 rounded-xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-[#2ecc71] flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-white" />
          </div>
          <h1 className="text-white font-semibold text-lg">Set Up Your Account</h1>
          <p className="text-slate-400 text-sm mt-1">
            Create a password to access your GreenFreightAcademy dashboard
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
            <AlertTriangle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a1628] border border-slate-700/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#2ecc71]"
              placeholder="At least 6 characters"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#0a1628] border border-slate-700/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#2ecc71]"
              placeholder="Re-enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#2ecc71] hover:bg-[#27ae60] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Setting up...
              </>
            ) : (
              "Set Up Account"
            )}
          </button>
        </form>

        <p className="text-slate-500 text-xs text-center mt-6">
          This link expires in 7 days and can only be used once.
        </p>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#2ecc71]" />
      </div>
    }>
      <SetupForm />
    </Suspense>
  );
}
