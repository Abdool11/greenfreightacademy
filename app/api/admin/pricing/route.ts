import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fetchCoursesDirect() {
  const url = `${SUPABASE_URL}/rest/v1/courses?select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
  const rows = await res.json();
  // Sort by name (or title fallback) since PostgREST order= has stale schema cache
  rows.sort((a: any, b: any) => {
    const aName = a.name || a.title || "";
    const bName = b.name || b.title || "";
    return aName.localeCompare(bName);
  });
  return rows;
}

// GET /api/admin/pricing — fetch all course prices
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  try {
    const courses = await fetchCoursesDirect();
    return NextResponse.json({ courses: courses ?? [] });
  } catch (err: any) {
    console.error("[PRICING GET ERROR]", err);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

// PATCH /api/admin/pricing — update a course price
export async function PATCH(req: NextRequest) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { courseId, price_corporate, price_individual, is_visible } = await req.json();

  if (!courseId) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (price_corporate !== undefined) updates.price_corporate = Number(price_corporate);
  if (price_individual !== undefined) updates.price_individual = Number(price_individual);
  if (is_visible !== undefined) updates.is_visible = Boolean(is_visible);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/courses?id=eq.${encodeURIComponent(courseId)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.pgrst.object+json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase error ${res.status}: ${err}`);
    }

    const data = await res.json();

    // Log the price change for audit trail (non-blocking)
    fetch(`${SUPABASE_URL}/rest/v1/admin_audit_log`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        admin_id: session.adminId,
        action: "pricing_update",
        target_type: "course",
        target_id: courseId,
        details: JSON.stringify(updates),
        created_at: new Date().toISOString(),
      }),
    }).catch(() => {});

    return NextResponse.json({ ok: true, course: data });
  } catch (err: any) {
    console.error("Pricing update error:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
