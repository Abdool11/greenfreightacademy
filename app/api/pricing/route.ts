import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/pricing — public endpoint; returns all available courses with prices
// This is consumed by TAG to display centralised GFA pricing on the Academy page.
export async function GET() {
  try {
    const { data: coursesRaw, error } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("available", true);

    if (error) {
      console.error("[Public Pricing API]", error);
      return NextResponse.json({ error: "Failed to load pricing" }, { status: 500 });
    }

    const courses = (coursesRaw ?? [])
      .map((c: any) => ({
        id: c.id,
        name: c.name || c.title || "",
        slug: c.slug,
        price_corporate: c.price_corporate ?? 0,
        price_individual: c.price_individual ?? 0,
        available: c.available ?? c.is_active ?? true,
        description: c.description || "",
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return NextResponse.json(
      { courses },
      {
        headers: {
          // Allow TAG (or any origin) to read this endpoint via CORS
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error("[Public Pricing API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Handle pre-flight CORS requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
