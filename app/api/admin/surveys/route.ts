/**
 * GET  /api/admin/surveys          — list all surveys (pre + post)
 * POST /api/admin/surveys          — create a new survey question
 * PUT  /api/admin/surveys          — bulk reorder questions (array of {id, order_index})
 *
 * Database table: surveys
 *   id              UUID PK
 *   type            TEXT  — 'pre' | 'post'
 *   question_en     TEXT  — English question text
 *   question_zu     TEXT  — isiZulu question text
 *   question_type   TEXT  — 'multiple_choice' | 'scale' | 'text'
 *   options_json    JSONB — [{value, label_en, label_zu}] for multiple_choice; null for others
 *   order_index     INT   — display order within the survey type
 *   is_active       BOOL  — if false, question is hidden from drivers
 *   created_at      TIMESTAMPTZ
 *   updated_at      TIMESTAMPTZ
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

// ── GET — list all survey questions ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("surveys")
    .select("*")
    .order("type", { ascending: true })
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ surveys: data ?? [] });
}

// ── POST — create a new question ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    type?: string;
    question_en?: string;
    question_zu?: string;
    question_type?: string;
    options_json?: unknown;
    order_index?: number;
    is_active?: boolean;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { type, question_en, question_type } = body;
  if (!type || !question_en || !question_type) {
    return NextResponse.json({ error: "type, question_en, and question_type are required" }, { status: 400 });
  }
  if (!["pre", "post"].includes(type)) {
    return NextResponse.json({ error: "type must be 'pre' or 'post'" }, { status: 400 });
  }
  if (!["multiple_choice", "scale", "text"].includes(question_type)) {
    return NextResponse.json({ error: "question_type must be 'multiple_choice', 'scale', or 'text'" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Auto-assign order_index if not provided
  let orderIndex = body.order_index;
  if (orderIndex === undefined) {
    const { data: last } = await supabase
      .from("surveys")
      .select("order_index")
      .eq("type", type)
      .order("order_index", { ascending: false })
      .limit(1)
      .single();
    orderIndex = last ? (last.order_index as number) + 1 : 0;
  }

  const { data, error } = await supabase
    .from("surveys")
    .insert({
      type,
      question_en: body.question_en,
      question_zu: body.question_zu ?? "",
      question_type,
      options_json: body.options_json ?? null,
      order_index: orderIndex,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ survey: data }, { status: 201 });
}

// ── PUT — bulk reorder ────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const adminSession = await getAdminSession();
  if (!adminSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { reorder?: Array<{ id: string; order_index: number }> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.reorder?.length) {
    return NextResponse.json({ error: "reorder array required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const updates = body.reorder.map(({ id, order_index }) =>
    supabase.from("surveys").update({ order_index }).eq("id", id),
  );
  await Promise.all(updates);

  return NextResponse.json({ ok: true });
}
