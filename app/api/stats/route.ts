import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/stats — public, no auth required
// Returns platform statistics for the bragging strips on GFA, TAG, and BD.
// Admin can override each stat with a static number OR select live DB count.
// Config keys in site_config:
//   stats_companies_mode / stats_companies_static
//   stats_drivers_mode / stats_drivers_static
//   stats_certificates_mode / stats_certificates_static
//   stats_workshops_mode / stats_workshops_static
//   contact_email

const FALLBACK = {
  companies: 7,
  drivers: 252,
  certificates: 207,
  workshops: 34,
  contact_email: "durbanroadtransport@gmail.com",
  last_updated: null as string | null,
  source: "fallback" as "live" | "static" | "fallback",
};

async function getAdminConfig(): Promise<Record<string, string>> {
  try {
    const { data } = await supabaseAdmin
      .from("site_config")
      .select("key, value")
      .in("key", [
        "stats_companies_mode", "stats_companies_static",
        "stats_drivers_mode", "stats_drivers_static",
        "stats_certificates_mode", "stats_certificates_static",
        "stats_workshops_mode", "stats_workshops_static",
        "contact_email",
      ]);
    const result: Record<string, string> = {};
    (data ?? []).forEach((row: { key: string; value: string }) => {
      result[row.key] = row.value ?? "";
    });
    return result;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const adminConfig = await getAdminConfig();

    const resolve = async (
      modeKey: string,
      staticKey: string,
      fallbackVal: number,
      liveQuery: () => Promise<number | null>
    ): Promise<number> => {
      const mode = adminConfig[modeKey] || "static";
      if (mode === "live") {
        const liveVal = await liveQuery();
        return liveVal ?? fallbackVal;
      }
      const staticVal = parseInt(adminConfig[staticKey] ?? "", 10);
      return isNaN(staticVal) ? fallbackVal : staticVal;
    };

    const [companies, drivers, certificates, workshops] = await Promise.all([
      resolve("stats_companies_mode", "stats_companies_static", FALLBACK.companies, async () => {
        const { count } = await supabaseAdmin.from("companies").select("*", { count: "exact", head: true }).eq("status", "active");
        return count;
      }),
      resolve("stats_drivers_mode", "stats_drivers_static", FALLBACK.drivers, async () => {
        const { count } = await supabaseAdmin.from("drivers").select("*", { count: "exact", head: true }).eq("status", "active");
        return count;
      }),
      resolve("stats_certificates_mode", "stats_certificates_static", FALLBACK.certificates, async () => {
        const { count } = await supabaseAdmin.from("certifications").select("*", { count: "exact", head: true }).eq("status", "active");
        return count;
      }),
      resolve("stats_workshops_mode", "stats_workshops_static", FALLBACK.workshops, async () => null),
    ]);

    const contactEmail = adminConfig.contact_email || FALLBACK.contact_email;

    const data = {
      companies,
      drivers,
      certificates,
      workshops,
      contact_email: contactEmail,
      last_updated: new Date().toISOString(),
      source: "live" as const,
    };

    return NextResponse.json(data, {
      headers: {
        // Cache for 15 minutes at CDN, serve stale for up to 30 minutes while revalidating
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        // Allow TAG and other ecosystem sites to call this endpoint cross-origin
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (err) {
    console.error("[Stats API] Unexpected error:", err);
    return NextResponse.json(FALLBACK, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
