"use client";
import { useState, useRef, useEffect } from "react";
import { Upload, CheckCircle2, AlertCircle, Eye, Settings2, RefreshCw } from "lucide-react";

interface TextPositions {
  nameY: number;
  programmeY: number;
  dateX: number;
  dateY: number;
  certNumX: number;
  certNumY: number;
}

const DEFAULT_POSITIONS: TextPositions = {
  nameY: 480,
  programmeY: 640,
  dateX: 156,
  dateY: 835,
  certNumX: 1030,
  certNumY: 835,
};

export default function CertificateTemplateClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [usingDefault, setUsingDefault] = useState(true);
  const [positions, setPositions] = useState<TextPositions>(DEFAULT_POSITIONS);
  const [showPositions, setShowPositions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load current template on mount
  useEffect(() => {
    fetch("/api/admin/certificate-template")
      .then(r => r.json())
      .then(data => {
        setCurrentUrl(data.templateUrl);
        setUsingDefault(data.usingDefault);
        if (data.textPositions) setPositions({ ...DEFAULT_POSITIONS, ...data.textPositions });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStatus(null);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("text_positions", JSON.stringify(positions));
      const res = await fetch("/api/admin/certificate-template", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setCurrentUrl(data.url);
      setUsingDefault(false);
      setStatus({ type: "success", message: data.message });
      setFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const posField = (label: string, key: keyof TextPositions) => (
    <div key={key}>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <input
        type="number"
        value={positions[key]}
        onChange={e => setPositions(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
        className="w-full bg-background border border-border/50 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Certificate Template</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Upload a custom certificate background image. The system will overlay the driver name,
          programme name, issue date, and certificate number on top of this image when generating PDFs.
          Supported formats: PNG, JPG (max 10 MB, recommended size: 1754 × 1240 px).
        </p>
      </div>

      {/* Current template */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Current Active Template</h2>
          {usingDefault ? (
            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Using built-in default
            </span>
          ) : (
            <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
              Custom template active
            </span>
          )}
        </div>
        {loading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
          </div>
        ) : currentUrl ? (
          <div className="rounded-lg overflow-hidden border border-border/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentUrl} alt="Current certificate template" className="w-full" />
          </div>
        ) : (
          <div className="rounded-lg border border-border/40 bg-muted/20 h-40 flex items-center justify-center">
            <div className="text-center">
              <Eye size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Built-in default template is active</p>
              <p className="text-xs text-muted-foreground mt-1">Upload a custom template below to replace it</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload new template */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold mb-4">Upload New Template</h2>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors mb-4"
        >
          <Upload size={28} className="text-muted-foreground mx-auto mb-3" />
          {file ? (
            <p className="text-sm font-medium">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
          ) : (
            <>
              <p className="text-sm font-medium">Click to select a file</p>
              <p className="text-xs text-muted-foreground mt-1">PNG or JPG, max 10 MB, recommended 1754 × 1240 px</p>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" onChange={handleFileChange} className="hidden" />
        </div>

        {/* Preview */}
        {preview && (
          <div className="rounded-lg overflow-hidden border border-border/40 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="New template preview" className="w-full" />
          </div>
        )}

        {/* Text positions toggle */}
        <button
          type="button"
          onClick={() => setShowPositions(!showPositions)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <Settings2 size={14} />
          {showPositions ? "Hide" : "Adjust"} text overlay positions
        </button>

        {showPositions && (
          <div className="rounded-xl bg-muted/20 border border-border/30 p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              These coordinates control where the driver name, programme name, date, and certificate number
              are placed on the certificate. Values are in pixels on a 1754 × 1240 canvas.
              Y values measure from the top of the image.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {posField("Driver name — Y position", "nameY")}
              {posField("Programme name — Y position", "programmeY")}
              {posField("Date of issue — X position", "dateX")}
              {posField("Date of issue — Y position", "dateY")}
              {posField("Certificate No. — X position", "certNumX")}
              {posField("Certificate No. — Y position", "certNumY")}
            </div>
            <button
              type="button"
              onClick={() => setPositions(DEFAULT_POSITIONS)}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Reset to defaults
            </button>
          </div>
        )}

        {/* Status */}
        {status && (
          <div className={`flex items-start gap-2 rounded-lg p-3 mb-4 text-sm ${
            status.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}>
            {status.type === "success"
              ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
              : <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
            {status.message}
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <><RefreshCw size={14} className="animate-spin mr-2" /> Uploading…</>
          ) : (
            <><Upload size={14} className="mr-2" /> Upload and Activate Template</>
          )}
        </button>
      </div>

      {/* Notes */}
      <div className="rounded-xl bg-muted/20 border border-border/30 p-4 text-xs text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground mb-1">Design notes</p>
        <p>
          The certificate background should be a clean design at 1754 × 1240 pixels (A4 landscape at 150 dpi).
          Leave clear space in the centre of the image for the driver name and programme name text overlays.
          The system will place the driver name approximately one-third down the page and the programme name
          approximately halfway down. Date and certificate number are placed in the lower section.
        </p>
        <p className="mt-2">
          Uploading a new template takes effect immediately — all certificates generated after this point
          will use the new template. Previously issued certificates are not affected.
        </p>
      </div>
    </div>
  );
}
