import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/pricing — public endpoint; returns all available courses with prices
// This is consumed by TAG to display centralised GFA pricing on the Academy page.
export async function GET() {
  try {
    const { data: courses, error } = await supabaseAdmin
      .from("courses")
      .select("id, name, slug, price_corporate, price_individual, available, description")
      .eq("available", true)
      .order("name");

    if (error) {
      console.error("[Public Pricing API]", error);
      return NextResponse.json({ error: "Failed to load pricing" }, { status: 500 });
    }

    return NextResponse.json(
      { courses: courses ?? [] },
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
