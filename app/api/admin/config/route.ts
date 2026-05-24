import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { setConfig } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const entries: Record<string, string> = body;

    for (const [key, value] of Object.entries(entries)) {
      if (typeof value === "string") {
        await setConfig(key, value);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Config save error:", err);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
