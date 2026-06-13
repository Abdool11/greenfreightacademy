"use client";
export const dynamic = "force-dynamic";

import { useState, useRef } from "react";
import Link from "next/link";
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Users } from "lucide-react";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") { setError("Please upload an Excel file (.xlsx or .xls)"); return; }
    setError(""); setFile(f); setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/company/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Import failed."); return; }
      setResult(data); setFile(null);
    } catch { setError("Upload failed. Please try again."); }
    finally { setUploading(false); }
  };

  const downloadTemplate = () => {
    const headers = ["First Name", "Last Name", "Mobile Number", "Alternative Number", "Email", "Branch", "Region"];
    const csv = headers.join(",") + "\nJohn,Doe,0821234567,0831234567,john@example.com,Durban,KwaZulu-Natal";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "GFA_Driver_Import_Template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      <section style={{ padding: "3rem 0 2.5rem", background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="container-gfa">
          <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "#6b7280", fontSize: "0.875rem", textDecoration: "none", marginBottom: "1.25rem" }}>
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
          <span className="pill-badge pill-green" style={{ marginBottom: "1rem", display: "inline-flex" }}>Driver Import</span>
          <h1 style={{ maxWidth: "600px", marginBottom: "0.75rem", fontSize: "1.75rem" }}>Import your driver list</h1>
          <p style={{ maxWidth: "520px", color: "var(--text-secondary)", fontSize: "0.9375rem" }}>Upload an Excel file with your driver details. Use our template to ensure the correct format.</p>
        </div>
      </section>

      <section style={{ padding: "3rem 0 4rem" }}>
        <div className="container-gfa">
          <div style={{ maxWidth: "600px" }}>
            <div style={{ background: "#0d1520", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "1rem", padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9375rem", color: "#f9fafb" }}>Required columns</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {["First Name *", "Last Name *", "Mobile Number *", "Alternative Number", "Email", "Branch", "Region"].map(col => (
                  <div key={col} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: col.includes("*") ? "#f9fafb" : "#9ca3af", fontSize: "0.8125rem" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: col.includes("*") ? "#22c55e" : "#374151", flexShrink: 0 }} />
                    {col}
                  </div>
                ))}
              </div>
              <button onClick={downloadTemplate} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "0.5rem", padding: "0.5rem 1rem", color: "#22c55e", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", marginTop: "1rem" }}>
                <Download size={14} /> Download Excel template
              </button>
            </div>

            {result ? (
              <div style={{ background: "#0d1520", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "1rem", padding: "2rem", textAlign: "center" }}>
                <CheckCircle2 size={40} style={{ color: "#22c55e", margin: "0 auto 1rem", display: "block" }} />
                <h3 style={{ margin: "0 0 0.5rem" }}>Import complete</h3>
                <p style={{ color: "#9ca3af", marginBottom: "1.25rem" }}>{result.imported} drivers imported successfully{result.skipped > 0 ? `, ${result.skipped} skipped (duplicates)` : ""}.</p>
                {result.errors.length > 0 && (
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "0.625rem", padding: "0.875rem", marginBottom: "1.25rem", textAlign: "left" }}>
                    <p style={{ color: "#f87171", fontSize: "0.8125rem", margin: "0 0 0.5rem", fontWeight: 600 }}>Rows with errors:</p>
                    {result.errors.map((e, i) => <p key={i} style={{ color: "#9ca3af", fontSize: "0.8125rem", margin: "0.125rem 0" }}>{e}</p>)}
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                  <button onClick={() => setResult(null)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.625rem", padding: "0.625rem 1.25rem", color: "#9ca3af", fontSize: "0.875rem", cursor: "pointer" }}>Import another file</button>
                  <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", background: "#22c55e", color: "#000", borderRadius: "0.625rem", padding: "0.625rem 1.25rem", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none" }}>
                    <Users size={14} /> Go to dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.625rem", padding: "0.75rem 1rem", marginBottom: "1rem", color: "#f87171", fontSize: "0.875rem" }}>
                    <AlertCircle size={16} />{error}
                  </div>
                )}
                <div
                  onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                  onClick={() => inputRef.current?.click()}
                  style={{ border: `2px dashed ${file ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: "1rem", padding: "3rem 2rem", textAlign: "center", cursor: "pointer", background: file ? "rgba(34,197,94,0.04)" : "transparent", transition: "all 0.2s" }}
                >
                  <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  <Upload size={32} style={{ color: file ? "#22c55e" : "#4b5563", margin: "0 auto 1rem", display: "block" }} />
                  {file ? (
                    <>
                      <p style={{ color: "#22c55e", fontWeight: 600, margin: "0 0 0.25rem" }}>{file.name}</p>
                      <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>{(file.size / 1024).toFixed(1)} KB — click to change</p>
                    </>
                  ) : (
                    <>
                      <p style={{ color: "#f9fafb", fontWeight: 600, margin: "0 0 0.25rem" }}>Drop your Excel file here</p>
                      <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>or click to browse — .xlsx or .xls</p>
                    </>
                  )}
                </div>
                {file && (
                  <button onClick={handleUpload} disabled={uploading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "#22c55e", color: "#000", border: "none", borderRadius: "0.625rem", padding: "0.875rem", fontWeight: 700, fontSize: "0.9375rem", cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.7 : 1, marginTop: "1rem" }}>
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    {uploading ? "Importing drivers..." : "Import drivers"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
