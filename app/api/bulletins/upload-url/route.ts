import { NextRequest, NextResponse } from "next/server";
import { getCompanyFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

// POST /api/bulletins/upload-url
// Returns a signed upload URL for a bulletin image (Supabase Storage)
// Body: { filename: string, contentType: string }
// Returns: { uploadUrl: string, publicUrl: string, path: string }
export async function POST(req: NextRequest) {
  const company = await getCompanyFromRequest(req);
  if (!company) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { filename, contentType } = await req.json();
  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType required" }, { status: 400 });
  }

  // Validate content type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(contentType)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF images are allowed" }, { status: 400 });
  }

  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const path = `bulletin-images/${company.id}/${uuidv4()}.${ext}`;

  // Create a signed upload URL (valid for 60 seconds)
  const { data, error } = await supabaseAdmin.storage
    .from("gfa-assets")
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("[upload-url]", error);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }

  // Build the public URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/gfa-assets/${path}`;

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    publicUrl,
    path,
  });
}
