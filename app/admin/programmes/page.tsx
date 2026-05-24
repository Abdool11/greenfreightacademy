"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus, Pencil, Trash2, X, Save, Loader2,
  BookOpen, ChevronLeft, AlertCircle, CheckCircle2, Archive,
} from "lucide-react";

interface Programme {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price_corporate?: number;
  price_model: string;
  duration_weeks?: number;
  module_count?: number;
  cpd_frequency: string;
  audience: string;
  moodle_course_id?: string;
  status: string;
  created_at: string;
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  price_corporate: "",
  price_model: "per_driver_per_month",
  duration_weeks: "",
  module_count: "12",
  cpd_frequency: "quarterly",
  audience: "drivers",
  moodle_course_id: "",
  status: "active",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  in_development: "#f59e0b",
  archived: "#6b7280",
};

const AUDIENCE_LABELS: Record<string, string> = {
  drivers: "Drivers",
  managers: "Managers",
  all_staff: "All Staff",
};

const CPD_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

export default function AdminProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchProgrammes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/programmes");
      if (res.ok) {
        const data = await res.json();
        setProgrammes(data.programmes || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProgrammes(); }, []);

  const slugify = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name, slug: editingId ? f.slug : slugify(name) }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEdit = (p: Programme) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description || "",
      price_corporate: p.price_corporate?.toString() || "",
      price_model: p.price_model,
      duration_weeks: p.duration_weeks?.toString() || "",
      module_count: p.module_count?.toString() || "",
      cpd_frequency: p.cpd_frequency,
      audience: p.audience,
      moodle_course_id: p.moodle_course_id || "",
      status: p.status,
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handleSave = async () => {
    setError("");
    if (!form.name.trim()) { setError("Programme name is required."); return; }
    if (!form.slug.trim()) { setError("Slug is required."); return; }

    setSaving(true);
    try {
      const payload = editingId
        ? { id: editingId, ...form }
        : { ...form };

      const res = await fetch("/api/admin/programmes", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save."); return; }

      setSuccess(editingId ? "Programme updated." : "Programme created.");
      setShowForm(false);
      await fetchProgrammes();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Archive or delete this programme? If it has active enrolments it will be archived.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/programmes?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to delete."); return; }
      setSuccess(data.message || "Programme removed.");
      await fetchProgrammes();
    } finally {
      setDeleting(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#0d1520", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "0.5rem", padding: "0.625rem 0.875rem", color: "#f9fafb",
    fontSize: "0.875rem", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", color: "#9ca3af", fontSize: "0.75rem",
    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem",
  };

  return (
    <div style={{ paddingTop: "5rem", background: "var(--color-slate-900)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(160deg, #0a1628 0%, #0f1f3d 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "2rem 0" }}>
        <div className="container-gfa" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link href="/admin/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#6b7280", fontSize: "0.8125rem", textDecoration: "none" }}>
              <ChevronLeft size={16} /> Admin
            </Link>
            <span style={{ color: "#374151" }}>/</span>
            <span style={{ color: "#f9fafb", fontWeight: 600 }}>Programmes</span>
          </div>
          <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#22c55e", border: "none", borderRadius: "0.625rem", padding: "0.625rem 1.25rem", color: "#000", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
            <Plus size={15} /> New Programme
          </button>
        </div>
      </div>

      <div className="container-gfa" style={{ padding: "2.5rem 0 4rem" }}>
        {success && (
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "0.75rem", padding: "0.875rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", color: "#22c55e" }}>
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        {/* Programme Form Modal */}
        {showForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <div style={{ background: "#0f1f3d", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1rem", padding: "2rem", width: "100%", maxWidth: "640px", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.125rem", color: "#f9fafb" }}>
                  {editingId ? "Edit Programme" : "New Programme"}
                </h2>
                <button onClick={() => setShowForm(false)} style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#f87171", fontSize: "0.875rem" }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                {/* Name */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Programme Name *</label>
                  <input value={form.name} onChange={e => handleNameChange(e.target.value)} style={inputStyle} placeholder="e.g. Professional Truck Driver Programme" />
                </div>

                {/* Slug */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Slug (URL identifier) *</label>
                  <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} style={inputStyle} placeholder="e.g. ptdp" />
                  <p style={{ margin: "0.375rem 0 0", color: "#6b7280", fontSize: "0.75rem" }}>Lowercase letters, numbers, and hyphens only. Used in URLs and Moodle integration.</p>
                </div>

                {/* Description */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} placeholder="Short description shown on the programmes page" />
                </div>

                {/* Price */}
                <div>
                  <label style={labelStyle}>Price (R)</label>
                  <input type="number" value={form.price_corporate} onChange={e => setForm(f => ({ ...f, price_corporate: e.target.value }))} style={inputStyle} placeholder="e.g. 35" min="0" step="0.01" />
                </div>

                {/* Price Model */}
                <div>
                  <label style={labelStyle}>Pricing Model</label>
                  <select value={form.price_model} onChange={e => setForm(f => ({ ...f, price_model: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="per_driver_per_month">Per driver per month</option>
                    <option value="once_off">Once-off per person</option>
                  </select>
                </div>

                {/* Module Count */}
                <div>
                  <label style={labelStyle}>Number of Modules</label>
                  <input type="number" value={form.module_count} onChange={e => setForm(f => ({ ...f, module_count: e.target.value }))} style={inputStyle} placeholder="e.g. 12" min="1" />
                </div>

                {/* Duration */}
                <div>
                  <label style={labelStyle}>Duration (weeks)</label>
                  <input type="number" value={form.duration_weeks} onChange={e => setForm(f => ({ ...f, duration_weeks: e.target.value }))} style={inputStyle} placeholder="e.g. 52" min="1" />
                </div>

                {/* CPD Frequency */}
                <div>
                  <label style={labelStyle}>CPD Frequency</label>
                  <select value={form.cpd_frequency} onChange={e => setForm(f => ({ ...f, cpd_frequency: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>

                {/* Audience */}
                <div>
                  <label style={labelStyle}>Target Audience</label>
                  <select value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="drivers">Drivers</option>
                    <option value="managers">Managers</option>
                    <option value="all_staff">All Staff</option>
                  </select>
                </div>

                {/* Moodle Course ID */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Moodle Course ID</label>
                  <input value={form.moodle_course_id} onChange={e => setForm(f => ({ ...f, moodle_course_id: e.target.value }))} style={inputStyle} placeholder="e.g. 42 (from Moodle admin panel)" />
                  <p style={{ margin: "0.375rem 0 0", color: "#6b7280", fontSize: "0.75rem" }}>Enter the numeric course ID from your Moodle instance. Used to sync progress data.</p>
                </div>

                {/* Status */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="active">Active — available for enrolment</option>
                    <option value="in_development">In Development — visible but not bookable</option>
                    <option value="archived">Archived — hidden from all views</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={() => setShowForm(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", padding: "0.625rem 1.25rem", color: "#9ca3af", fontSize: "0.875rem", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#22c55e", border: "none", borderRadius: "0.5rem", padding: "0.625rem 1.25rem", color: "#000", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editingId ? "Save Changes" : "Create Programme"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Programme List */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.375rem", fontSize: "1.5rem", color: "#f9fafb" }}>Programme Management</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            Create and manage training programmes. Set the Moodle Course ID to enable live progress sync from the LMS.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280" }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: "0 auto 0.75rem", display: "block" }} />
            Loading programmes...
          </div>
        ) : programmes.length === 0 ? (
          <div style={{ background: "#0d1520", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "1rem", padding: "3rem", textAlign: "center", color: "#4b5563" }}>
            <BookOpen size={36} style={{ margin: "0 auto 1rem", display: "block" }} />
            <p style={{ margin: "0 0 1.25rem" }}>No programmes yet.</p>
            <button onClick={openCreate} style={{ background: "#22c55e", border: "none", borderRadius: "0.5rem", padding: "0.625rem 1.25rem", color: "#000", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
              Create your first programme
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {programmes.map(p => (
              <div key={p.id} style={{ background: "#0d1520", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "0.875rem", padding: "1.25rem 1.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.375rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: "#f9fafb", fontSize: "0.9375rem" }}>{p.name}</span>
                    <span style={{ background: `${STATUS_COLORS[p.status] || "#6b7280"}20`, color: STATUS_COLORS[p.status] || "#6b7280", border: `1px solid ${STATUS_COLORS[p.status] || "#6b7280"}40`, borderRadius: "9999px", padding: "0.125rem 0.625rem", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {p.status === "in_development" ? "In Development" : p.status === "archived" ? "Archived" : "Active"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", color: "#6b7280", fontSize: "0.8125rem" }}>
                    <span>
                      <span style={{ color: "#9ca3af" }}>Slug:</span> <code style={{ color: "#60a5fa", fontSize: "0.75rem" }}>{p.slug}</code>
                    </span>
                    <span>
                      <span style={{ color: "#9ca3af" }}>Price:</span> {p.price_corporate ? `R${p.price_corporate} ${p.price_model === "per_driver_per_month" ? "/ driver / month" : "once-off"}` : "—"}
                    </span>
                    <span>
                      <span style={{ color: "#9ca3af" }}>Modules:</span> {p.module_count ?? "—"}
                    </span>
                    <span>
                      <span style={{ color: "#9ca3af" }}>CPD:</span> {CPD_LABELS[p.cpd_frequency] || p.cpd_frequency}
                    </span>
                    <span>
                      <span style={{ color: "#9ca3af" }}>Audience:</span> {AUDIENCE_LABELS[p.audience] || p.audience}
                    </span>
                    {p.moodle_course_id && (
                      <span>
                        <span style={{ color: "#9ca3af" }}>Moodle ID:</span> <code style={{ color: "#a78bfa", fontSize: "0.75rem" }}>{p.moodle_course_id}</code>
                      </span>
                    )}
                    {p.duration_weeks && (
                      <span>
                        <span style={{ color: "#9ca3af" }}>Duration:</span> {p.duration_weeks} weeks
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p style={{ margin: "0.5rem 0 0", color: "#6b7280", fontSize: "0.8125rem", lineHeight: 1.5 }}>{p.description}</p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  <button onClick={() => openEdit(p)} style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.5rem", padding: "0.5rem 0.875rem", color: "#9ca3af", fontSize: "0.8125rem", cursor: "pointer" }}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "0.5rem", padding: "0.5rem 0.875rem", color: "#f87171", fontSize: "0.8125rem", cursor: "pointer" }}>
                    {deleting === p.id ? <Loader2 size={13} className="animate-spin" /> : (p.status === "archived" ? <Trash2 size={13} /> : <Archive size={13} />)}
                    {p.status === "archived" ? "Delete" : "Archive"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
