"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, X, Save, Loader2, GripVertical,
  CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type SurveyType = "pre" | "post";
type QuestionType = "multiple_choice" | "scale" | "text";

interface Option {
  value: string;
  label_en: string;
  label_zu: string;
}

interface SurveyQuestion {
  id: string;
  type: SurveyType;
  question_en: string;
  question_zu: string;
  question_type: QuestionType;
  options_json: Option[] | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  type: "pre" as SurveyType,
  question_en: "",
  question_zu: "",
  question_type: "multiple_choice" as QuestionType,
  options_json: [
    { value: "a", label_en: "", label_zu: "" },
    { value: "b", label_en: "", label_zu: "" },
    { value: "c", label_en: "", label_zu: "" },
    { value: "d", label_en: "", label_zu: "" },
  ] as Option[],
  is_active: true,
};

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  scale: "Scale (1–5)",
  text: "Free text",
};

const SCALE_OPTIONS: Option[] = [1, 2, 3, 4, 5].map(n => ({
  value: String(n),
  label_en: String(n),
  label_zu: String(n),
}));

export default function SurveysAdminClient() {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [activeTab, setActiveTab] = useState<SurveyType>("pre");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/surveys");
      const data = await res.json();
      setQuestions(data.surveys ?? []);
    } catch {
      setStatus({ type: "error", message: "Failed to load survey questions." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = questions
    .filter(q => q.type === activeTab)
    .sort((a, b) => a.order_index - b.order_index);

  const openNew = () => {
    setForm({ ...EMPTY_FORM, type: activeTab });
    setEditingId("new");
    setStatus(null);
  };

  const openEdit = (q: SurveyQuestion) => {
    setForm({
      type: q.type,
      question_en: q.question_en,
      question_zu: q.question_zu,
      question_type: q.question_type,
      options_json: q.options_json ?? EMPTY_FORM.options_json,
      is_active: q.is_active,
    });
    setEditingId(q.id);
    setStatus(null);
  };

  const closeEditor = () => { setEditingId(null); setStatus(null); };

  const handleSave = async () => {
    if (!form.question_en.trim()) {
      setStatus({ type: "error", message: "English question text is required." });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        ...form,
        options_json:
          form.question_type === "multiple_choice"
            ? form.options_json.filter(o => o.label_en.trim())
            : form.question_type === "scale"
            ? SCALE_OPTIONS
            : null,
      };

      let res: Response;
      if (editingId === "new") {
        res = await fetch("/api/admin/surveys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/surveys/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setStatus({ type: "success", message: editingId === "new" ? "Question added." : "Question updated." });
      await load();
      setTimeout(closeEditor, 800);
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/surveys/${id}`, { method: "DELETE" });
    if (res.ok) {
      setQuestions(prev => prev.filter(q => q.id !== id));
    }
  };

  const handleToggleActive = async (q: SurveyQuestion) => {
    await fetch(`/api/admin/surveys/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !q.is_active }),
    });
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, is_active: !x.is_active } : x));
  };

  // ── Drag-to-reorder ───────────────────────────────────────────────────────
  const handleDragStart = (id: string) => setDragItem(id);
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOver(id); };
  const handleDrop = async (targetId: string) => {
    if (!dragItem || dragItem === targetId) { setDragItem(null); setDragOver(null); return; }
    const list = [...filtered];
    const fromIdx = list.findIndex(q => q.id === dragItem);
    const toIdx = list.findIndex(q => q.id === targetId);
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    const reorder = list.map((q, i) => ({ id: q.id, order_index: i }));
    setQuestions(prev => {
      const others = prev.filter(q => q.type !== activeTab);
      return [...others, ...list.map((q, i) => ({ ...q, order_index: i }))];
    });
    setDragItem(null);
    setDragOver(null);
    await fetch("/api/admin/surveys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder }),
    });
  };

  const updateOption = (idx: number, field: keyof Option, value: string) => {
    setForm(prev => {
      const opts = [...prev.options_json];
      opts[idx] = { ...opts[idx], [field]: value };
      return { ...prev, options_json: opts };
    });
  };

  const addOption = () => {
    const nextVal = String.fromCharCode(97 + form.options_json.length);
    setForm(prev => ({
      ...prev,
      options_json: [...prev.options_json, { value: nextVal, label_en: "", label_zu: "" }],
    }));
  };

  const removeOption = (idx: number) => {
    setForm(prev => ({ ...prev, options_json: prev.options_json.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Survey Questions</h1>
          <p className="text-muted-foreground text-sm">
            Manage pre-course and post-course survey questions. Changes take effect immediately for new survey sessions.
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Add Question
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted/20 rounded-xl p-1 w-fit border border-border/30">
        {(["pre", "post"] as SurveyType[]).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "pre" ? "Pre-Course Survey" : "Post-Course Survey"}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === t ? "bg-white/20" : "bg-muted/40"
            }`}>
              {questions.filter(q => q.type === t).length}
            </span>
          </button>
        ))}
      </div>

      {/* Question list */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 size={18} className="animate-spin" /> Loading questions…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">No questions yet for the {activeTab}-course survey.</p>
          <button onClick={openNew} className="btn-primary flex items-center gap-2 mx-auto">
            <Plus size={15} /> Add first question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q, idx) => (
            <div
              key={q.id}
              draggable
              onDragStart={() => handleDragStart(q.id)}
              onDragOver={e => handleDragOver(e, q.id)}
              onDrop={() => handleDrop(q.id)}
              onDragEnd={() => { setDragItem(null); setDragOver(null); }}
              className={`card p-4 transition-all ${dragOver === q.id ? "border-primary/60 bg-primary/5" : ""} ${!q.is_active ? "opacity-50" : ""}`}
            >
              <div className="flex items-start gap-3">
                {/* Drag handle */}
                <div className="cursor-grab text-muted-foreground mt-1 flex-shrink-0">
                  <GripVertical size={16} />
                </div>
                {/* Question number */}
                <span className="text-xs font-mono text-muted-foreground mt-1 w-5 flex-shrink-0">{idx + 1}.</span>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{q.question_en}</p>
                  {q.question_zu && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">{q.question_zu}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs bg-muted/40 border border-border/30 px-2 py-0.5 rounded-full">
                      {TYPE_LABELS[q.question_type]}
                    </span>
                    {q.options_json?.length ? (
                      <span className="text-xs text-muted-foreground">{q.options_json.length} options</span>
                    ) : null}
                    {!q.is_active && (
                      <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(q)}
                    className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground"
                    title={q.is_active ? "Hide from drivers" : "Show to drivers"}
                  >
                    {q.is_active ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
                  </button>
                  <button
                    onClick={() => openEdit(q)}
                    className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editingId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/50 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h2 className="text-lg font-semibold">
                {editingId === "new" ? "Add Question" : "Edit Question"}
              </h2>
              <button onClick={closeEditor} className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Survey type */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Survey</label>
                <div className="flex gap-2">
                  {(["pre", "post"] as SurveyType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, type: t }))}
                      className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                        form.type === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/50 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {t === "pre" ? "Pre-Course" : "Post-Course"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question type */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Question Type</label>
                <div className="flex gap-2 flex-wrap">
                  {(["multiple_choice", "scale", "text"] as QuestionType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, question_type: t }))}
                      className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                        form.question_type === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/50 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* English question */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                  Question (English) <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={form.question_en}
                  onChange={e => setForm(prev => ({ ...prev, question_en: e.target.value }))}
                  rows={2}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Enter question in English…"
                />
              </div>

              {/* isiZulu question */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                  Question (isiZulu)
                  <span className="text-muted-foreground font-normal ml-1">— optional</span>
                </label>
                <textarea
                  value={form.question_zu}
                  onChange={e => setForm(prev => ({ ...prev, question_zu: e.target.value }))}
                  rows={2}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Faka umbuzo ngesiZulu…"
                />
              </div>

              {/* Options (multiple choice only) */}
              {form.question_type === "multiple_choice" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Answer Options</label>
                  <div className="space-y-2">
                    {form.options_json.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground w-5 text-center">{opt.value}</span>
                        <input
                          type="text"
                          value={opt.label_en}
                          onChange={e => updateOption(idx, "label_en", e.target.value)}
                          placeholder="English"
                          className="flex-1 bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="text"
                          value={opt.label_zu}
                          onChange={e => updateOption(idx, "label_zu", e.target.value)}
                          placeholder="isiZulu"
                          className="flex-1 bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          disabled={form.options_json.length <= 2}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-30"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {form.options_json.length < 8 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus size={12} /> Add option
                    </button>
                  )}
                </div>
              )}

              {form.question_type === "scale" && (
                <div className="rounded-lg bg-muted/20 border border-border/30 p-3 text-xs text-muted-foreground">
                  Drivers will see a 1–5 scale. No additional options needed.
                </div>
              )}

              {form.question_type === "text" && (
                <div className="rounded-lg bg-muted/20 border border-border/30 p-3 text-xs text-muted-foreground">
                  Drivers will see a free-text input field. No additional options needed.
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-lg bg-muted/20 border border-border/30 p-3">
                <div>
                  <p className="text-sm font-medium">Visible to drivers</p>
                  <p className="text-xs text-muted-foreground">Hidden questions are saved but not shown in the survey.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                  className="text-muted-foreground"
                >
                  {form.is_active
                    ? <ToggleRight size={28} className="text-green-400" />
                    : <ToggleLeft size={28} />}
                </button>
              </div>

              {/* Status */}
              {status && (
                <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
                  status.type === "success"
                    ? "bg-green-500/10 border border-green-500/20 text-green-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}>
                  {status.type === "success"
                    ? <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
                    : <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />}
                  {status.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border/30">
              <button onClick={closeEditor} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Question</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
