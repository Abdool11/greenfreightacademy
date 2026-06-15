import { createClient } from "@supabase/supabase-js";

// Use placeholder values when env vars are missing so the site runs in demo
// mode without crashing. All DB calls will fail gracefully and fall back to
// DEMO_METRICS / empty states.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";

// Public client — browser-safe reads
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service client — server-side writes and privileged reads
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// ─── Config helpers ──────────────────────────────────────────────────────────
export async function getConfig(key: string): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from("site_config")
      .select("value")
      .eq("key", key)
      .single();
    return data?.value ?? "";
  } catch {
    return "";
  }
}

// Map site_config keys → common env-var fallbacks
const CONFIG_ENV_FALLBACKS: Record<string, string[]> = {
  whatsapp_access_token: ["WHATSAPP_ACCESS_TOKEN", "META_WA_TOKEN"],
  whatsapp_phone_id: ["WHATSAPP_PHONE_NUMBER_ID", "META_WA_PHONE_NUMBER_ID"],
  bd_base_url: ["BD_BASE_URL", "BETTERDRIVER_URL", "NEXT_PUBLIC_BD_URL"],
  email_booking_to: ["EMAIL_BOOKING_TO"],
  company_name: ["COMPANY_NAME"],
  company_email: ["COMPANY_EMAIL"],
};

function envFallback(key: string): string | undefined {
  const candidates = CONFIG_ENV_FALLBACKS[key] ?? [];
  for (const envKey of candidates) {
    const val = process.env[envKey];
    if (val && val.trim() !== "") return val.trim();
  }
  return undefined;
}

export async function getConfigs(keys: string[]): Promise<Record<string, string>> {
  try {
    const { data } = await supabaseAdmin
      .from("site_config")
      .select("key, value")
      .in("key", keys);
    const result: Record<string, string> = {};
    (data ?? []).forEach((row: { key: string; value: string }) => {
      result[row.key] = row.value ?? "";
    });
    // Fallback to env vars for any missing keys
    for (const key of keys) {
      if (!result[key] || result[key].trim() === "") {
        const fallback = envFallback(key);
        if (fallback) result[key] = fallback;
      }
    }
    return result;
  } catch {
    const result: Record<string, string> = {};
    for (const key of keys) {
      const fallback = envFallback(key);
      if (fallback) result[key] = fallback;
    }
    return result;
  }
}

// ─── Write a single config value ──────────────────────────────────────────────
export async function setConfig(key: string, value: string): Promise<void> {
  await supabaseAdmin
    .from("site_config")
    .upsert({ key, value }, { onConflict: "key" });
}
