/**
 * Driver error translation
 * ─────────────────────────────────────────────────────────────────────────────
 * A Postgres unique-violation message must never reach a client screen. The
 * database still enforces its own uniqueness rules — including a
 * drivers.id_number unique index that predates the current schema files, so it
 * is not visible in supabase/migrations — and those rules are broader than the
 * company-scoped checks the API performs. Rather than echo the SQL error, the
 * failure is translated into language the client can act on.
 */
export function friendlyDriverInsertError(message: string | undefined | null): string {
  const raw = (message ?? "").toLowerCase();

  const isDuplicate =
    raw.includes("duplicate key") ||
    raw.includes("unique constraint") ||
    raw.includes("23505");

  if (isDuplicate) {
    if (raw.includes("id_number")) {
      return "This ID or passport number is already registered on the platform. Contact GFA if this driver should be linked to your company.";
    }
    if (raw.includes("mobile")) {
      return "This mobile number is already registered on the platform. Contact GFA if this driver should be linked to your company.";
    }
    return "This driver is already registered on the platform. Contact GFA if this driver should be linked to your company.";
  }

  return "This driver could not be saved. Please check the details and try again.";
}
