"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload, Loader2, CheckCircle2, AlertCircle, Users, Save, FileSpreadsheet,
} from "lucide-react";

interface DriverRow {
  first_name: string;
  last_name: string;
  mobile: string;
  email: string;
  selected: boolean;
}

interface QuoteDriverFormProps {
  quoteId: string;
  slotCount: number;
  onSaved: () => void;
}

const EMPTY_ROW: DriverRow = {
  first_name: "",
  last_name: "",
  mobile: "",
  email: "",
  selected: true,
};

export default function QuoteDriverForm({ quoteId, slotCount, onSaved }: QuoteDriverFormProps) {
  const [rows, setRows] = useState<DriverRow[]>(
    Array.from({ length: slotCount }, () => ({ ...EMPTY_ROW }))
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateRow = useCallback((index: number, field: keyof DriverRow, value: string | boolean) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  }, []);

  const selectedCount = rows.filter((r) => r.selected).length;
  const filledCount = rows.filter((r) => r.first_name.trim() && r.last_name.trim() && r.mobile.trim()).length;

  const handleUpload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
      setError("Please upload a .csv, .xlsx, or .xls file");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/company/quote/parse-spreadsheet", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to parse file");
        return;
      }

      const parsed: Array<{ first_name: string; last_name: string; mobile: string; email: string }> =
        data.drivers ?? [];

      if (parsed.length === 0) {
        setError("No valid driver rows found in the file.");
        return;
      }

      // Fill parsed data into existing rows (up to slotCount)
      setRows((prev) => {
        const next = [...prev];
        for (let i = 0; i < next.length && i < parsed.length; i++) {
          next[i] = {
            first_name: parsed[i].first_name,
            last_name: parsed[i].last_name,
            mobile: parsed[i].mobile,
            email: parsed[i].email,
            selected: true,
          };
        }
        // If parsed has more rows than slots, add extra rows
        if (parsed.length > next.length) {
          for (let i = next.length; i < parsed.length; i++) {
            next.push({
              first_name: parsed[i].first_name,
              last_name: parsed[i].last_name,
              mobile: parsed[i].mobile,
              email: parsed[i].email,
              selected: true,
            });
          }
        }
        return next;
      });

      if (data.errors?.length > 0) {
        setError(`${data.errors.length} row(s) had errors and were skipped.`);
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) {
      setError("Please select at least one driver to deploy.");
      return;
    }

    const invalid = selected.some(
      (r) => !r.first_name.trim() || !r.last_name.trim() || !r.mobile.trim()
    );
    if (invalid) {
      setError("Selected drivers must have first name, last name, and mobile number filled in.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/company/quote/${quoteId}/drivers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drivers: rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errorDetails?.length > 0) {
          setError(data.errorDetails.map((e: { index: number; field: string; message: string }) => `Driver ${e.index}: ${e.message}`).join("; "));
        } else {
          setError(data.error ?? "Failed to save driver details");
        }
        return;
      }
      setSuccess(`${data.driversCreated} driver(s) saved. You can now deploy training.`);
      setTimeout(() => onSaved(), 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#0a1120",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0.375rem",
    padding: "0.375rem 0.5rem",
    color: "#f9fafb",
    fontSize: "0.8125rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    color: "#6b7280",
    fontSize: "0.625rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    marginBottom: "0.2rem",
    display: "block",
  };

  return (
    <div
      style={{
        marginTop: "1rem",
        paddingTop: "1rem",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Users size={15} style={{ color: "#22c55e" }} />
          <span style={{ color: "#f9fafb", fontSize: "0.875rem", fontWeight: 600 }}>
            Driver Details
          </span>
          <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>
            ({filledCount}/{rows.length} filled · {selectedCount} selected)
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: "0.375rem",
              padding: "0.375rem 0.75rem",
              color: "#4ade80",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
            {uploading ? "Parsing..." : "Upload Excel / CSV"}
          </button>
        </div>
      </div>

      {/* Error / success messages */}
      {error && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "0.5rem",
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "0.5rem", padding: "0.625rem 0.875rem", marginBottom: "0.75rem",
          color: "#f87171", fontSize: "0.8125rem",
        }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
          {error}
        </div>
      )}
      {success && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: "0.5rem", padding: "0.625rem 0.875rem", marginBottom: "0.75rem",
          color: "#22c55e", fontSize: "0.8125rem",
        }}>
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          {success}
        </div>
      )}

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr 1fr 1.2fr 1.2fr",
          gap: "0.5rem",
          padding: "0 0.25rem 0.375rem",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <input
            type="checkbox"
            checked={rows.every((r) => r.selected)}
            ref={(el) => { if (el) el.indeterminate = rows.some((r) => r.selected) && !rows.every((r) => r.selected); }}
            onChange={(e) => toggleAll(e.target.checked)}
            style={{ width: "14px", height: "14px", cursor: "pointer", accentColor: "#22c55e" }}
            title="Select all / deselect all"
          />
        </div>
        <span style={labelStyle}>First Name *</span>
        <span style={labelStyle}>Last Name *</span>
        <span style={labelStyle}>Mobile *</span>
        <span style={labelStyle}>Email (optional)</span>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.25rem" }}>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 1fr 1.2fr 1.2fr",
              gap: "0.5rem",
              alignItems: "center",
              padding: "0.25rem",
              background: row.selected ? "rgba(34,197,94,0.03)" : "transparent",
              borderRadius: "0.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <input
                type="checkbox"
                checked={row.selected}
                onChange={(e) => updateRow(i, "selected", e.target.checked)}
                style={{ width: "14px", height: "14px", cursor: "pointer", accentColor: "#22c55e" }}
                title={`Select driver ${i + 1} for deployment`}
              />
            </div>
            <input
              type="text"
              placeholder={`Driver ${i + 1} first name`}
              value={row.first_name}
              onChange={(e) => updateRow(i, "first_name", e.target.value)}
              style={{
                ...inputStyle,
                opacity: row.selected ? 1 : 0.5,
              }}
            />
            <input
              type="text"
              placeholder={`Driver ${i + 1} last name`}
              value={row.last_name}
              onChange={(e) => updateRow(i, "last_name", e.target.value)}
              style={{
                ...inputStyle,
                opacity: row.selected ? 1 : 0.5,
              }}
            />
            <input
              type="tel"
              placeholder="082 123 4567"
              value={row.mobile}
              onChange={(e) => updateRow(i, "mobile", e.target.value)}
              style={{
                ...inputStyle,
                opacity: row.selected ? 1 : 0.5,
              }}
            />
            <input
              type="email"
              placeholder="optional"
              value={row.email}
              onChange={(e) => updateRow(i, "email", e.target.value)}
              style={{
                ...inputStyle,
                opacity: row.selected ? 1 : 0.5,
              }}
            />
          </div>
        ))}
      </div>

      {/* Save button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
        <button
          onClick={handleSave}
          disabled={saving || selectedCount === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            background: selectedCount === 0 ? "rgba(34,197,94,0.3)" : "#22c55e",
            border: "none",
            borderRadius: "0.375rem",
            padding: "0.5rem 1.25rem",
            color: "#000",
            fontSize: "0.8125rem",
            fontWeight: 700,
            cursor: saving || selectedCount === 0 ? "not-allowed" : "pointer",
          }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving..." : `Save ${selectedCount} Driver${selectedCount !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
