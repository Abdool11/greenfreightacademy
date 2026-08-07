import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/admin/settings/notifications/log — recent notification log
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { data: log } = await supabaseAdmin
    .from("admin_notification_log")
    .select("event_key, channel, recipient, status, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return NextResponse.json({ log: log ?? [] });
}
