"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Upload, Video, Trash2, CheckCircle2, AlertCircle,
  Loader2, Film, Globe, Lock, RefreshCw, Play
} from "lucide-react";

interface GFAVideo {
  id: string;
  title: string;
  description: string | null;
  video_type: "invite" | "teaser" | "portal_walkthrough" | "module";
  bunny_video_id: string | null;
  playback_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  language: string;
  programme: string | null;
  is_public: boolean;
  upload_status: "pending" | "processing" | "ready" | "error";
  created_at: string;
}

const VIDEO_TYPE_LABELS: Record<string, string> = {
  invite: "Campaign Invite",
  teaser: "Marketing Teaser",
  portal_walkthrough: "Portal Walkthrough",
  module: "Training Module",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#3b82f6",
  ready: "#22c55e",
  error: "#ef4444",
};

export default function VideoLibraryPage() {
  const [videos, setVideos] = useState<GFAVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterLang, setFilterLang] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    video_type: "invite",
    language: "en",
    programme: "",
    is_public: false,
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (filterLang !== "all") params.set("language", filterLang);
      const res = await fetch(`/api/admin/video-library?${params}`);
      const data = await res.json();
      setVideos(data.videos ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVideos(); }, [filterType, filterLang]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) { setUploadError("Please select a video file."); return; }
    setUploading(true);
    setUploadError("");
    setUploadProgress(0);

    try {
      // Step 1: Create video record + get Bunny upload URL
      const createRes = await fetch("/api/admin/video-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadForm),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error ?? "Failed to create video record");

      const { uploadUrl, uploadHeaders, video } = createData;

      // Step 2: Upload the file directly to Bunny.net via XHR (for progress tracking)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        Object.entries(uploadHeaders).forEach(([k, v]) => xhr.setRequestHeader(k, v as string));
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(uploadFile);
      });

      // Step 3: Mark as processing in our DB
      await fetch("/api/admin/video-library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: video.id, upload_status: "processing" }),
      });

      setUploadSuccess(true);
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(false);
        setUploadFile(null);
        setUploadForm({ title: "", description: "", video_type: "invite", language: "en", programme: "", is_public: false });
        setUploadProgress(0);
        fetchVideos();
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/video-library?id=${id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      fetchVideos();
    } catch {
      // silent
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const cardStyle: React.CSSProperties = {
    background: "#111f3a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0.875rem",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a1628", color: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: "#111f3a", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 1.5rem", height: "3.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/admin/dashboard" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: "0.875rem" }}>← Dashboard</Link>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Video Library</span>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "#16a34a", border: "none", borderRadius: "0.5rem", color: "#fff", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
        >
          <Upload size={15} /> Upload Video
        </button>
      </nav>

      <div style={{ padding: "1.5rem", maxWidth: "72rem", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 800, margin: "0 0 0.375rem" }}>Video Library</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", margin: 0 }}>
            Manage all videos — campaign invite videos, marketing teasers, portal walkthroughs, and training modules. All videos are hosted on Bunny.net.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: "0.5rem 0.875rem", background: "#111f3a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "0.5rem", color: "#f9fafb", fontSize: "0.875rem" }}
          >
            <option value="all">All types</option>
            <option value="invite">Campaign Invite</option>
            <option value="teaser">Marketing Teaser</option>
            <option value="portal_walkthrough">Portal Walkthrough</option>
            <option value="module">Training Module</option>
          </select>
          <select
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            style={{ padding: "0.5rem 0.875rem", background: "#111f3a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "0.5rem", color: "#f9fafb", fontSize: "0.875rem" }}
          >
            <option value="all">All languages</option>
            <option value="en">English</option>
            <option value="zu">Zulu</option>
            <option value="af">Afrikaans</option>
          </select>
          <button
            onClick={fetchVideos}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", cursor: "pointer" }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Video grid */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem", color: "rgba(255,255,255,0.4)" }}>
            <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : videos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", color: "rgba(255,255,255,0.3)" }}>
            <Film size={40} style={{ marginBottom: "1rem", opacity: 0.4 }} />
            <p style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.5rem" }}>No videos yet</p>
            <p style={{ fontSize: "0.875rem", margin: 0 }}>Upload your first video to get started.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(20rem, 1fr))", gap: "1rem" }}>
            {videos.map((video) => (
              <div key={video.id} style={cardStyle}>
                {/* Thumbnail / preview */}
                <div style={{ background: "#0a1628", borderRadius: "0.5rem", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Video size={32} style={{ color: "rgba(255,255,255,0.15)" }} />
                  )}
                  {/* Status badge */}
                  <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", padding: "0.2rem 0.5rem", background: `${STATUS_COLORS[video.upload_status]}22`, border: `1px solid ${STATUS_COLORS[video.upload_status]}55`, borderRadius: "9999px", fontSize: "0.6875rem", fontWeight: 700, color: STATUS_COLORS[video.upload_status] }}>
                    {video.upload_status.toUpperCase()}
                  </div>
                  {/* Public badge */}
                  <div style={{ position: "absolute", top: "0.5rem", left: "0.5rem" }}>
                    {video.is_public
                      ? <Globe size={14} style={{ color: "#22c55e" }} />
                      : <Lock size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
                    }
                  </div>
                </div>

                {/* Info */}
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                    <p style={{ fontWeight: 700, fontSize: "0.9375rem", margin: 0, lineHeight: 1.3 }}>{video.title}</p>
                    <span style={{ fontSize: "0.6875rem", padding: "0.2rem 0.5rem", background: "rgba(255,255,255,0.06)", borderRadius: "0.25rem", whiteSpace: "nowrap", color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>
                      {VIDEO_TYPE_LABELS[video.video_type] ?? video.video_type}
                    </span>
                  </div>
                  {video.description && (
                    <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.45)", margin: "0.25rem 0 0", lineHeight: 1.4 }}>{video.description}</p>
                  )}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{video.language.toUpperCase()}</span>
                    {video.programme && <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>· {video.programme.toUpperCase()}</span>}
                    {video.duration_seconds && <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>· {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, "0")}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.75rem" }}>
                  {video.playback_url && (
                    <button
                      onClick={() => copyUrl(video.playback_url!)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", padding: "0.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.375rem", color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", cursor: "pointer" }}
                    >
                      <Play size={13} /> Copy URL
                    </button>
                  )}
                  {deleteConfirm === video.id ? (
                    <div style={{ display: "flex", gap: "0.375rem", flex: 1 }}>
                      <button
                        onClick={() => handleDelete(video.id)}
                        style={{ flex: 1, padding: "0.5rem", background: "#ef4444", border: "none", borderRadius: "0.375rem", color: "#fff", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}
                      >
                        Confirm delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        style={{ padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.375rem", color: "rgba(255,255,255,0.5)", fontSize: "0.8125rem", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(video.id)}
                      style={{ padding: "0.5rem 0.625rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.375rem", color: "#ef4444", cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUploadModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div style={{ background: "#111f3a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1rem", padding: "1.75rem", width: "100%", maxWidth: "28rem", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 1.25rem" }}>Upload Video</h2>

            {uploadSuccess ? (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <CheckCircle2 size={40} style={{ color: "#22c55e", marginBottom: "0.75rem" }} />
                <p style={{ fontWeight: 700, fontSize: "1rem", margin: "0 0 0.25rem" }}>Upload started!</p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", margin: 0 }}>Bunny.net is processing your video. Status will update to &quot;ready&quot; when complete.</p>
              </div>
            ) : (
              <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.375rem" }}>Title *</label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g. P1 Campaign Invite — English"
                    required
                    style={{ width: "100%", padding: "0.625rem 0.875rem", background: "#0a1628", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "0.5rem", color: "#f9fafb", fontSize: "0.9375rem", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.375rem" }}>Description</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    placeholder="Optional description"
                    rows={2}
                    style={{ width: "100%", padding: "0.625rem 0.875rem", background: "#0a1628", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "0.5rem", color: "#f9fafb", fontSize: "0.875rem", resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.375rem" }}>Video Type *</label>
                    <select
                      value={uploadForm.video_type}
                      onChange={(e) => setUploadForm({ ...uploadForm, video_type: e.target.value })}
                      style={{ width: "100%", padding: "0.625rem 0.875rem", background: "#0a1628", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "0.5rem", color: "#f9fafb", fontSize: "0.875rem" }}
                    >
                      <option value="invite">Campaign Invite</option>
                      <option value="teaser">Marketing Teaser</option>
                      <option value="portal_walkthrough">Portal Walkthrough</option>
                      <option value="module">Training Module</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.375rem" }}>Language</label>
                    <select
                      value={uploadForm.language}
                      onChange={(e) => setUploadForm({ ...uploadForm, language: e.target.value })}
                      style={{ width: "100%", padding: "0.625rem 0.875rem", background: "#0a1628", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "0.5rem", color: "#f9fafb", fontSize: "0.875rem" }}
                    >
                      <option value="en">English</option>
                      <option value="zu">Zulu</option>
                      <option value="af">Afrikaans</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.375rem" }}>Programme</label>
                    <select
                      value={uploadForm.programme}
                      onChange={(e) => setUploadForm({ ...uploadForm, programme: e.target.value })}
                      style={{ width: "100%", padding: "0.625rem 0.875rem", background: "#0a1628", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "0.5rem", color: "#f9fafb", fontSize: "0.875rem" }}
                    >
                      <option value="">General</option>
                      <option value="p1">P1 — Professional Driver</option>
                      <option value="p2">P2 — Advanced</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", paddingBottom: "0.625rem" }}>
                      <input
                        type="checkbox"
                        checked={uploadForm.is_public}
                        onChange={(e) => setUploadForm({ ...uploadForm, is_public: e.target.checked })}
                        style={{ width: "1rem", height: "1rem" }}
                      />
                      Public (no auth)
                    </label>
                  </div>
                </div>

                {/* File picker */}
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.375rem" }}>Video File *</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: "2px dashed rgba(255,255,255,0.15)", borderRadius: "0.625rem", padding: "1.25rem", textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,0.02)" }}
                  >
                    <Upload size={24} style={{ color: "rgba(255,255,255,0.3)", marginBottom: "0.5rem" }} />
                    <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                      {uploadFile ? uploadFile.name : "Click to select MP4 or MOV file"}
                    </p>
                    {uploadFile && (
                      <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", margin: "0.25rem 0 0" }}>
                        {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    style={{ display: "none" }}
                  />
                </div>

                {/* Progress */}
                {uploading && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.375rem" }}>
                      <span>Uploading to Bunny.net…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "9999px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${uploadProgress}%`, background: "#22c55e", borderRadius: "9999px", transition: "width 0.2s" }} />
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.5rem", fontSize: "0.875rem", color: "#ef4444" }}>
                    <AlertCircle size={16} /> {uploadError}
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
                  <button
                    type="submit"
                    disabled={uploading}
                    style={{ flex: 1, padding: "0.75rem", background: uploading ? "rgba(22,163,74,0.5)" : "#16a34a", border: "none", borderRadius: "0.5rem", color: "#fff", fontWeight: 700, fontSize: "0.9375rem", cursor: uploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                  >
                    {uploading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Uploading…</> : <><Upload size={16} /> Upload</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowUploadModal(false); setUploadError(""); }}
                    style={{ padding: "0.75rem 1.25rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem", color: "rgba(255,255,255,0.6)", fontSize: "0.9375rem", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
