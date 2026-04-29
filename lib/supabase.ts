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
    return result;
  } catch {
    return {};
  }
}

// ─── Write a single config value ──────────────────────────────────────────────
export async function setConfig(key: string, value: string): Promise<void> {
  await supabaseAdmin
    .from("site_config")
    .upsert({ key, value }, { onConflict: "key" });
}
