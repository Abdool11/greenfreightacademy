"use client";

import { useState, useCallback } from "react";
import { X, Loader2, Plus, Trash2, AlertCircle, CheckCircle2, UserPlus, Phone } from "lucide-react";

interface DriverRow {
  first_name: string;
  last_name: string;
  mobile: string;
  email: string;
  id_number: string;
}

interface DriverError {
  index: number;
  field: string;
  message: string;
}

interface AddDriversModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

/** Valid SA mobile prefixes after the leading 27 */
const VALID_SA_PREFIXES = new Set([
  "60","61","62","63","64","65","66","67","68","69",
  "71","72","73","74","76","78","79","81","82","83","84",
]);

function normaliseSAMobile(raw: string): string {
  let m = raw.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  if (m.startsWith("27")) return m;
  if (m.startsWith("0")) return "27" + m.slice(1);
  return "27" + m;
}

function validateSAMobile(raw: string): { ok: true; normalised: string } | { ok: false; error: string } {
  const m = normaliseSAMobile(raw);
  if (m.length !== 11) {
    return { ok: false, error: `Must be 11 digits (got ${m.length})` };
  }
  const prefix = m.slice(2, 4);
  if (!VALID_SA_PREFIXES.has(prefix)) {
    return { ok: false, error: `Invalid SA prefix (${prefix})` };
  }
  return { ok: true, normalised: m };
}

function validateEmail(email: string): boolean {
  if (!email.trim()) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getFieldError(row: DriverRow, field: keyof DriverRow): string | null {
  if (field === "first_name") {
    if (!row.first_name.trim()) return "Required";
    if (row.first_name.trim().length < 1) return "Too short";
  }
  if (field === "last_name") {
    if (!row.last_name.trim()) return "Required";
    if (row.last_name.trim().length < 1) return "Too short";
  }
  if (field === "mobile") {
    if (!row.mobile.trim()) return "Required";
    const check = validateSAMobile(row.mobile);
    if (!check.ok) return check.error;
  }
  if (field === "email") {
    // Email is optional; if provided, validate format
    if (row.email.trim() && !validateEmail(row.email)) return "Invalid email";
  }
  return null;
}

const EMPTY_ROW: DriverRow = {
  first_name: "",
  last_name: "",
  mobile: "",
  email: "",
  id_number: "",
};

export default function AddDriversModal({ onClose, onSuccess }: AddDriversModalProps) {
  const [rows, setRows] = useState<DriverRow[]>([{ ...EMPTY_ROW }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    drivers: { id: string; name: string; mobile: string }[];
    duplicates: number;
    errors: number;
    errorDetails: DriverError[];
  } | null>(null);

  const updateRow = useCallback((index: number, field: keyof DriverRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev; // keep at least one row
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const hasAnyData = rows.some((r) =>
    r.first_name.trim() || r.last_name.trim() || r.mobile.trim() || r.email.trim()
  );

  const allRowsValid = rows.every((row) => {
    const isPopulated = row.first_name.trim() || row.last_name.trim() || row.mobile.trim();
    if (!isPopulated) return true; // empty rows are ignored by handleSubmit
    return (
      !getFieldError(row, "first_name") &&
      !getFieldError(row, "last_name") &&
      !getFieldError(row, "mobile") &&
      !getFieldError(row, "email")
    );
  });

  const handleSubmit = async () => {
    // Filter out completely empty rows
    const populatedRows = rows.filter(
      (r) => r.first_name.trim() || r.last_name.trim() || r.mobile.trim()
    );

    if (populatedRows.length === 0) {
      setSubmitError("Please fill in at least one driver.");
      return;
    }

    // Client-side pre-validation
    const clientErrors: DriverError[] = [];
    for (let i = 0; i < populatedRows.length; i++) {
      const row = populatedRows[i];
      const idx = i + 1;
      const fErr = getFieldError(row, "first_name");
      if (fErr) clientErrors.push({ index: idx, field: "first_name", message: fErr });
      const lErr = getFieldError(row, "last_name");
      if (lErr) clientErrors.push({ index: idx, field: "last_name", message: lErr });
      const mErr = getFieldError(row, "mobile");
      if (mErr) clientErrors.push({ index: idx, field: "mobile", message: mErr });
      const eErr = getFieldError(row, "email");
      if (eErr) clientErrors.push({ index: idx, field: "email", message: eErr });
    }

    if (clientErrors.length > 0) {
      setSubmitError(`Please fix ${clientErrors.length} error(s) before submitting.`);
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/company/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drivers: populatedRows }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setSubmitError(data?.error ?? data?.detail ?? "Failed to add drivers. Please try again.");
        return;
      }
      setResult({
        created: data.created,
        drivers: data.drivers ?? [],
        duplicates: data.duplicates ?? 0,
        errors: data.errors ?? 0,
        errorDetails: data.errorDetails ?? [],
      });
      // Refresh parent dashboard regardless of how many were created
      onSuccess();
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const inputStyle = (error?: string | null): React.CSSProperties => ({
    width: "100%",
    background: "#0a1120",
    border: `1px solid ${error ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: "0.5rem",
    padding: "0.5rem 0.625rem",
    color: "#f9fafb",
    fontSize: "0.875rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#9ca3af",
    fontSize: "0.6875rem",
    fontWeight: 600,
    marginBottom: "0.25rem",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  };

  const fieldWrapperStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
    minWidth: 0,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "#0d1520",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "1rem",
          width: "100%",
          maxWidth: "840px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div
              style={{
                background: "rgba(34,197,94,0.12)",
                borderRadius: "0.5rem",
                padding: "0.375rem",
                color: "#22c55e",
              }}
            >
              <UserPlus size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", color: "#f9fafb", fontWeight: 700 }}>
                Add Drivers
              </h3>
              <p style={{ margin: "0.125rem 0 0", fontSize: "0.75rem", color: "#6b7280" }}>
                Enter driver details. Mobile numbers must be valid SA numbers for WhatsApp delivery.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            style={{
              background: "transparent",
              border: "none",
              color: "#6b7280",
              cursor: submitting ? "not-allowed" : "pointer",
              padding: "0.25rem",
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1 }}>
          {result ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Success summary */}
              <div
                style={{
                  background: result.created > 0 ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                  border: `1px solid ${result.created > 0 ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
                  borderRadius: "0.75rem",
                  padding: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <CheckCircle2
                  size={22}
                  style={{ color: result.created > 0 ? "#22c55e" : "#f59e0b", flexShrink: 0 }}
                />
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: "#f9fafb", fontSize: "0.9375rem" }}>
                    {result.created} driver{result.created !== 1 ? "s" : ""} added
                    {result.duplicates > 0 ? ` ┬╖ ${result.duplicates} duplicate${result.duplicates !== 1 ? "s" : ""} skipped` : ""}
                    {result.errors > 0 ? ` ┬╖ ${result.errors} error${result.errors !== 1 ? "s" : ""}` : ""}
                  </p>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "#9ca3af" }}>
                    Mobile numbers normalised to E.164 format. Placeholder emails generated where not provided.
                  </p>
                </div>
              </div>

              {/* Created list */}
              {result.drivers.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 0.625rem", fontSize: "0.8125rem", color: "#9ca3af", fontWeight: 600 }}>
                    Newly added drivers
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    {result.drivers.map((d) => (
                      <div
                        key={d.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "0.5rem",
                          padding: "0.625rem 0.875rem",
                        }}
                      >
                        <span style={{ fontSize: "0.875rem", color: "#f9fafb", fontWeight: 600 }}>
                          {d.name}
                        </span>
                        <span style={{ fontSize: "0.8125rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <Phone size={12} />
                          {d.mobile}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errorDetails.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 0.625rem", fontSize: "0.8125rem", color: "#f87171", fontWeight: 600 }}>
                    Errors
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    {result.errorDetails.map((e, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          background: "rgba(239,68,68,0.06)",
                          border: "1px solid rgba(239,68,68,0.15)",
                          borderRadius: "0.5rem",
                          padding: "0.5rem 0.75rem",
                          fontSize: "0.8125rem",
                          color: "#f87171",
                        }}
                      >
                        <AlertCircle size={13} />
                        Row {e.index}: {e.message} ({e.field})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setResult(null);
                    setRows([{ ...EMPTY_ROW }]);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "0.5rem",
                    padding: "0.625rem 1.25rem",
                    color: "#9ca3af",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={14} /> Add more
                </button>
                <button
                  onClick={onClose}
                  style={{
                    background: "#22c55e",
                    border: "none",
                    borderRadius: "0.5rem",
                    padding: "0.625rem 1.5rem",
                    color: "#000",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Column headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.2fr 1.3fr 1.2fr 1fr 40px",
                  gap: "0.5rem",
                  padding: "0 0.25rem",
                }}
              >
                <span style={labelStyle}>First name *</span>
                <span style={labelStyle}>Last name *</span>
                <span style={labelStyle}>Mobile *</span>
                <span style={labelStyle}>Email (optional)</span>
                <span style={labelStyle}>ID Number</span>
                <span />
              </div>

              {/* Rows */}
              {rows.map((row, i) => {
                const fErr = getFieldError(row, "first_name");
                const lErr = getFieldError(row, "last_name");
                const mErr = getFieldError(row, "mobile");
                const eErr = getFieldError(row, "email");
                const hasValue =
                  row.first_name.trim() || row.last_name.trim() || row.mobile.trim();
                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1.2fr 1.3fr 1.2fr 1fr 40px",
                      gap: "0.5rem",
                      alignItems: "start",
                      padding: "0.625rem",
                      background: hasValue ? "rgba(255,255,255,0.02)" : "transparent",
                      borderRadius: "0.5rem",
                      border: hasValue ? "1px solid rgba(255,255,255,0.04)" : "1px solid transparent",
                    }}
                  >
                    <div style={fieldWrapperStyle}>
                      <input
                        type="text"
                        placeholder="e.g. John"
                        value={row.first_name}
                        onChange={(e) => updateRow(i, "first_name", e.target.value)}
                        style={inputStyle(fErr)}
                      />
                      {fErr && (
                        <span style={{ fontSize: "0.6875rem", color: "#f87171" }}>{fErr}</span>
                      )}
                    </div>
                    <div style={fieldWrapperStyle}>
                      <input
                        type="text"
                        placeholder="e.g. Sithole"
                        value={row.last_name}
                        onChange={(e) => updateRow(i, "last_name", e.target.value)}
                        style={inputStyle(lErr)}
                      />
                      {lErr && (
                        <span style={{ fontSize: "0.6875rem", color: "#f87171" }}>{lErr}</span>
                      )}
                    </div>
                    <div style={fieldWrapperStyle}>
                      <input
                        type="tel"
                        placeholder="082 123 4567"
                        value={row.mobile}
                        onChange={(e) => updateRow(i, "mobile", e.target.value)}
                        style={inputStyle(mErr)}
                      />
                      {mErr && (
                        <span style={{ fontSize: "0.6875rem", color: "#f87171" }}>{mErr}</span>
                      )}
                      {!mErr && row.mobile.trim() && (
                        <span style={{ fontSize: "0.6875rem", color: "#22c55e" }}>
                          {normaliseSAMobile(row.mobile)}
                        </span>
                      )}
                    </div>
                    <div style={fieldWrapperStyle}>
                      <input
                        type="email"
                        placeholder="Optional: john@company.co.za"
                        value={row.email}
                        onChange={(e) => updateRow(i, "email", e.target.value)}
                        style={inputStyle(eErr)}
                      />
                      {eErr && (
                        <span style={{ fontSize: "0.6875rem", color: "#f87171" }}>{eErr}</span>
                      )}
                    </div>
                    <div style={fieldWrapperStyle}>
                      <input
                        type="text"
                        placeholder="ID number"
                        value={row.id_number}
                        onChange={(e) => updateRow(i, "id_number", e.target.value)}
                        style={inputStyle(null)}
                      />
                    </div>
                    <button
                      onClick={() => removeRow(i)}
                      disabled={rows.length <= 1}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: rows.length <= 1 ? "#1f2937" : "#6b7280",
                        cursor: rows.length <= 1 ? "not-allowed" : "pointer",
                        padding: "0.5rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: "0.125rem",
                      }}
                      title={rows.length <= 1 ? "Cannot remove last row" : "Remove row"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}

              {/* Add row */}
              <button
                onClick={addRow}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  background: "transparent",
                  border: "1px dashed rgba(255,255,255,0.15)",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 0.875rem",
                  color: "#9ca3af",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                <Plus size={14} /> Add another driver
              </button>

              {submitError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: "0.625rem",
                    padding: "0.75rem 1rem",
                    color: "#f87171",
                    fontSize: "0.875rem",
                  }}
                >
                  <AlertCircle size={16} />
                  {submitError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 1.5rem",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Phone size={14} style={{ color: "#6b7280" }} />
              <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                SA mobile numbers only. Auto-formatted to E.164 (27XXXXXXXXX).
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button
                onClick={handleClose}
                disabled={submitting}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.5rem",
                  padding: "0.625rem 1.25rem",
                  color: "#9ca3af",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !hasAnyData || !allRowsValid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  background: !hasAnyData || !allRowsValid ? "rgba(34,197,94,0.3)" : "#22c55e",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.625rem 1.5rem",
                  color: "#000",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  cursor: !hasAnyData || !allRowsValid ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                {submitting ? "Adding..." : `Add ${rows.filter((r) => r.first_name.trim() && r.last_name.trim() && r.mobile.trim()).length} driver${rows.filter((r) => r.first_name.trim() && r.last_name.trim() && r.mobile.trim()).length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
