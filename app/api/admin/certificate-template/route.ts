/**
 * POST /api/admin/certificate-template
 * =====================================
 * Uploads a new certificate background image to Supabase Storage and sets it
 * as the active template in the `settings` table.
 *
 * MULTIPART FORM FIELDS:
 *   file          — PNG or JPG image (max 10 MB)
 *   text_positions — Optional JSON string overriding text overlay coordinates
 *
 * STORAGE:
 *   Bucket: certificate-templates (must be created in Supabase dashboard)
 *   Path:   certificate-bg-{timestamp}.png
 *   Access: Public read, authenticated write
 *
 * SETTINGS TABLE ROWS WRITTEN:
 *   key = 'certificate_template_url'    → public URL of the uploaded image
 *   key = 'certificate_text_positions'  → JSON of text overlay coordinates (if provided)
 *
 * AUTH: Admin session required.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "@/lib/auth";

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dummy",
  );

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const BUCKET = "certificate-templates";

export async function POST(req: NextRequest) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse multipart form ───────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const textPositionsRaw = formData.get("text_positions") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File must be PNG or JPG" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });
  }

  // Validate text positions JSON if provided
  if (textPositionsRaw) {
    try {
      JSON.parse(textPositionsRaw);
    } catch {
      return NextResponse.json({ error: "text_positions must be valid JSON" }, { status: 400 });
    }
  }

  const supabase = getSupabase();

  // ── 3. Upload to Supabase Storage ─────────────────────────────────────────
  const ext = file.type === "image/png" ? "png" : "jpg";
  const filename = `certificate-bg-${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[CERT_TEMPLATE] Upload error:", uploadError);
    return NextResponse.json({ error: "Upload failed", detail: uploadError.message }, { status: 500 });
  }

  // ── 4. Get public URL ─────────────────────────────────────────────────────
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  const publicUrl = urlData.publicUrl;

  // ── 5. Update settings table ──────────────────────────────────────────────
  await supabase
    .from("settings")
    .upsert({ key: "certificate_template_url", value: publicUrl }, { onConflict: "key" });

  if (textPositionsRaw) {
    await supabase
      .from("settings")
      .upsert({ key: "certificate_text_positions", value: textPositionsRaw }, { onConflict: "key" });
  }

  return NextResponse.json({
    ok: true,
    url: publicUrl,
    filename,
    message: "Certificate template updated successfully. All new certificates will use this template.",
  });
}

export async function GET(req: NextRequest) {
  // Return the current active template URL and text positions
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["certificate_template_url", "certificate_text_positions"]);

  const result: Record<string, string> = {};
  for (const row of settings ?? []) {
    result[row.key] = row.value;
  }

  return NextResponse.json({
    templateUrl: result["certificate_template_url"] ?? null,
    textPositions: result["certificate_text_positions"]
      ? JSON.parse(result["certificate_text_positions"])
      : null,
    usingDefault: !result["certificate_template_url"],
  });
}
