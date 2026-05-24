import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdminSession } from "@/lib/auth";

// ─── Bunny.net config ─────────────────────────────────────────────────────────
const BUNNY_API_KEY = process.env.BUNNY_API_KEY ?? "";
const BUNNY_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID ?? "";
const BUNNY_CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME ?? ""; // e.g. vz-abc123.b-cdn.net

// ─── GET /api/admin/video-library — list all videos ──────────────────────────
export async function GET(req: NextRequest) {
  try {
    await requireAdminSession(req);

    const { searchParams } = new URL(req.url);
    const videoType = searchParams.get("type"); // filter by type
    const language = searchParams.get("language");

    let query = supabaseAdmin
      .from("gfa_videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (videoType) query = query.eq("video_type", videoType);
    if (language) query = query.eq("language", language);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ videos: data ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST /api/admin/video-library — create video record + get Bunny upload URL
export async function POST(req: NextRequest) {
  try {
    await requireAdminSession(req);

    const body = await req.json();
    const { title, description, video_type, language, programme, is_public } = body;

    if (!title || !video_type) {
      return NextResponse.json({ error: "title and video_type are required" }, { status: 400 });
    }

    // 1. Create a video object in Bunny.net Stream
    const bunnyRes = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          AccessKey: BUNNY_API_KEY,
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!bunnyRes.ok) {
      const bunnyErr = await bunnyRes.text();
      console.error("[video-library] Bunny create video error:", bunnyErr);
      return NextResponse.json({ error: "Failed to create video in Bunny.net" }, { status: 502 });
    }

    const bunnyVideo = await bunnyRes.json();
    const bunnyVideoId: string = bunnyVideo.guid;

    // 2. Build the playback URL (HLS stream)
    const playbackUrl = BUNNY_CDN_HOSTNAME
      ? `https://${BUNNY_CDN_HOSTNAME}/${bunnyVideoId}/playlist.m3u8`
      : null;

    // 3. Build the direct upload URL for the client to PUT the file to
    // Bunny.net uses a direct PUT to: https://video.bunnycdn.com/library/{libraryId}/videos/{videoId}
    const uploadUrl = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}`;

    // 4. Create the record in our DB
    const { data: videoRecord, error: dbError } = await supabaseAdmin
      .from("gfa_videos")
      .insert({
        title,
        description: description ?? null,
        video_type,
        bunny_video_id: bunnyVideoId,
        bunny_library_id: BUNNY_LIBRARY_ID,
        playback_url: playbackUrl,
        language: language ?? "en",
        programme: programme ?? null,
        is_public: is_public ?? false,
        upload_status: "pending",
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      video: videoRecord,
      uploadUrl,
      uploadHeaders: {
        AccessKey: BUNNY_API_KEY,
        "Content-Type": "video/*",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("[video-library POST]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH /api/admin/video-library — update video record (status, thumbnail, etc.)
export async function PATCH(req: NextRequest) {
  try {
    await requireAdminSession(req);

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("gfa_videos")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ video: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE /api/admin/video-library — delete video from Bunny.net and DB
export async function DELETE(req: NextRequest) {
  try {
    await requireAdminSession(req);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // Get the Bunny video ID first
    const { data: video } = await supabaseAdmin
      .from("gfa_videos")
      .select("bunny_video_id")
      .eq("id", id)
      .single();

    if (video?.bunny_video_id) {
      // Delete from Bunny.net
      await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${video.bunny_video_id}`,
        {
          method: "DELETE",
          headers: { AccessKey: BUNNY_API_KEY },
        }
      );
    }

    // Delete from DB
    const { error } = await supabaseAdmin.from("gfa_videos").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
