"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
} from "lucide-react";

interface Course {
  id: string;
  name: string;
  slug: string;
  price_corporate: number;
  price_individual: number;
  available: boolean;
  description?: string;
}

export default function AdminPricingPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [edits, setEdits] = useState<Record<string, Partial<Course>>>({});

  // Urgent bulletin fee
  const [bulletinFee, setBulletinFee] = useState<number>(1000);
  const [bulletinFeeInput, setBulletinFeeInput] = useState<string>("1000");
  const [savingBulletinFee, setSavingBulletinFee] = useState(false);
  const [savedBulletinFee, setSavedBulletinFee] = useState(false);
  const [bulletinFeeError, setBulletinFeeError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/bulletin-fee")
      .then((r) => r.json())
      .then((d) => {
        if (d.fee !== undefined) {
          setBulletinFee(d.fee);
          setBulletinFeeInput(String(d.fee));
        }
      })
      .catch(() => {});
  }, []);

  const saveBulletinFee = async () => {
    const feeNum = Number(bulletinFeeInput);
    if (isNaN(feeNum) || feeNum < 0) {
      setBulletinFeeError("Please enter a valid amount (0 or more).");
      return;
    }
    setSavingBulletinFee(true);
    setBulletinFeeError("");
    try {
      const res = await fetch("/api/admin/settings/bulletin-fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fee: feeNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setBulletinFee(feeNum);
      setSavedBulletinFee(true);
      setTimeout(() => setSavedBulletinFee(false), 3000);
    } catch (e: any) {
      setBulletinFeeError(e.message);
    } finally {
      setSavingBulletinFee(false);
    }
  };

  useEffect(() => {
    fetch("/api/admin/pricing")
      .then((r) => r.json())
      .then((d) => {
        if (d.courses) setCourses(d.courses);
      })
      .catch(() => setError("Failed to load pricing data"))
      .finally(() => setLoading(false));
  }, []);

  function updateEdit(courseId: string, field: keyof Course, value: unknown) {
    setEdits((prev) => ({
      ...prev,
      [courseId]: { ...prev[courseId], [field]: value },
    }));
  }

  async function saveCourse(course: Course) {
    const edit = edits[course.id];
    if (!edit || Object.keys(edit).length === 0) return;

    setSaving(course.id);
    setError("");

    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, ...edit }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }

      // Update local state
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, ...data.course } : c))
      );
      setEdits((prev) => {
        const next = { ...prev };
        delete next[course.id];
        return next;
      });
      setSaved(course.id);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  function getVal(course: Course, field: keyof Course) {
    return edits[course.id]?.[field] !== undefined
      ? edits[course.id][field]
      : course[field];
  }

  const adminNavStyle: React.CSSProperties = {
    background: "#0a1628",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    padding: "1rem 1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060e1a", color: "#f9fafb" }}>
      {/* Nav */}
      <div style={adminNavStyle}>
        <Link
          href="/admin/dashboard"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#9ca3af", textDecoration: "none", fontSize: "0.875rem" }}
        >
          <ArrowLeft size={15} /> Admin Dashboard
        </Link>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>›</span>
        <span style={{ color: "#f9fafb", fontWeight: 600, fontSize: "0.875rem" }}>Pricing Management</span>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <DollarSign size={20} style={{ color: "#22c55e" }} />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Pricing Management</h1>
          </div>
          <p style={{ color: "#6b7280", margin: 0, fontSize: "0.9375rem" }}>
            Set per-candidate prices for each programme. Changes take effect immediately on the public Programmes and Pricing pages.
          </p>
        </div>

        {/* Info banner */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "0.875rem 1rem",
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: "0.75rem",
            marginBottom: "1.75rem",
            fontSize: "0.875rem",
            color: "#9ca3af",
            lineHeight: 1.6,
          }}
        >
          <RefreshCw size={14} style={{ color: "#22c55e", flexShrink: 0, marginTop: "0.125rem" }} />
          <span>
            <strong style={{ color: "#f9fafb" }}>Prices are per candidate.</strong> The public Programmes and Pricing pages read directly from this table — no code changes needed. VAT (15%) is added automatically at invoice time.
          </span>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "0.625rem",
              color: "#f87171",
              fontSize: "0.875rem",
              marginBottom: "1rem",
            }}
          >
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "3rem", justifyContent: "center" }}>
            <Loader2 size={20} style={{ color: "#22c55e", animation: "spin 1s linear infinite" }} />
            <span style={{ color: "#6b7280" }}>Loading pricing data…</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {courses.map((course) => {
              const hasEdits = edits[course.id] && Object.keys(edits[course.id]).length > 0;
              const isSaving = saving === course.id;
              const isSaved = saved === course.id;
              const isAvailable = getVal(course, "available") as boolean;

              return (
                <div
                  key={course.id}
                  style={{
                    background: "#0a1628",
                    border: `1px solid ${hasEdits ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: "0.875rem",
                    padding: "1.25rem 1.5rem",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1rem", color: "#f9fafb", marginBottom: "0.25rem" }}>
                        {course.name}
                      </div>
                      {course.description && (
                        <div style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: 1.5, maxWidth: "500px" }}>
                          {course.description}
                        </div>
                      )}
                    </div>

                    {/* Visibility toggle */}
                    <button
                      onClick={() => updateEdit(course.id, "available", !isAvailable)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        padding: "0.375rem 0.75rem",
                        background: isAvailable ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                        border: `1px solid ${isAvailable ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                        borderRadius: "0.5rem",
                        color: isAvailable ? "#22c55e" : "#f87171",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {isAvailable ? <Eye size={13} /> : <EyeOff size={13} />}
                      {isAvailable ? "Visible" : "Hidden"}
                    </button>
                  </div>

                  {/* Price inputs */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#9ca3af", marginBottom: "0.375rem" }}>
                        Corporate price (per candidate)
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: "#6b7280", fontSize: "0.9375rem", fontWeight: 600 }}>R</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={getVal(course, "price_corporate") as number}
                          onChange={(e) => updateEdit(course.id, "price_corporate", e.target.value)}
                          style={{
                            flex: 1,
                            padding: "0.625rem 0.75rem",
                            background: "#060e1a",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "0.5rem",
                            color: "#f9fafb",
                            fontSize: "1rem",
                            fontWeight: 600,
                            outline: "none",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#4b5563", marginTop: "0.25rem" }}>
                        + 15% VAT = R{Math.round((getVal(course, "price_corporate") as number) * 1.15)} per candidate
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#9ca3af", marginBottom: "0.375rem" }}>
                        Individual price (per candidate)
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: "#6b7280", fontSize: "0.9375rem", fontWeight: 600 }}>R</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={getVal(course, "price_individual") as number}
                          onChange={(e) => updateEdit(course.id, "price_individual", e.target.value)}
                          style={{
                            flex: 1,
                            padding: "0.625rem 0.75rem",
                            background: "#060e1a",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "0.5rem",
                            color: "#f9fafb",
                            fontSize: "1rem",
                            fontWeight: 600,
                            outline: "none",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#4b5563", marginTop: "0.25rem" }}>
                        + 15% VAT = R{Math.round((getVal(course, "price_individual") as number) * 1.15)} per candidate
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  {(hasEdits || isSaved) && (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => saveCourse(course)}
                        disabled={isSaving || isSaved}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 1rem",
                          background: isSaved ? "rgba(34,197,94,0.15)" : "#22c55e",
                          border: "none",
                          borderRadius: "0.5rem",
                          color: isSaved ? "#22c55e" : "#000",
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          cursor: isSaving || isSaved ? "default" : "pointer",
                        }}
                      >
                        {isSaving ? (
                          <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
                        ) : isSaved ? (
                          <><CheckCircle2 size={14} /> Saved</>
                        ) : (
                          <><Save size={14} /> Save changes</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Urgent Bulletin Fee ── */}
        <div style={{
          marginTop: "2.5rem",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "1rem",
          padding: "1.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <Zap size={20} style={{ color: "#f59e0b" }} />
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#f9fafb", margin: 0 }}>Urgent Bulletin Fee</h2>
          </div>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.25rem", lineHeight: 1.6 }}>
            This fee is charged when a client sends an urgent driver bulletin to their own fleet only.
            The fee is waived if the client opts to share the bulletin with the community CPD library.
            Standard bulletins are always free and automatically shared.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "#9ca3af" }}>R</span>
              <input
                type="number"
                min={0}
                step={50}
                value={bulletinFeeInput}
                onChange={(e) => { setBulletinFeeInput(e.target.value); setSavedBulletinFee(false); }}
                style={{
                  width: "120px",
                  padding: "0.625rem 0.75rem",
                  background: "#060e1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.5rem",
                  color: "#f9fafb",
                  fontSize: "1rem",
                  fontWeight: 600,
                  outline: "none",
                }}
              />
              <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>excl. VAT</span>
            </div>
            <button
              onClick={saveBulletinFee}
              disabled={savingBulletinFee || savedBulletinFee}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: savedBulletinFee ? "rgba(34,197,94,0.15)" : "#22c55e",
                border: "none",
                borderRadius: "0.5rem",
                color: savedBulletinFee ? "#22c55e" : "#000",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: savingBulletinFee || savedBulletinFee ? "default" : "pointer",
              }}
            >
              {savingBulletinFee ? (
                <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
              ) : savedBulletinFee ? (
                <><CheckCircle2 size={14} /> Saved</>
              ) : (
                <><Save size={14} /> Save fee</>
              )}
            </button>
          </div>
          {bulletinFeeError && (
            <p style={{ fontSize: "0.8rem", color: "#ef4444", marginTop: "0.5rem" }}>{bulletinFeeError}</p>
          )}
          <p style={{ fontSize: "0.75rem", color: "#4b5563", marginTop: "0.75rem" }}>
            Current fee: <strong style={{ color: "#f9fafb" }}>R{bulletinFee.toLocaleString("en-ZA")}</strong> (excl. VAT)
          </p>
        </div>
      </div>
    </div>
  );
}
