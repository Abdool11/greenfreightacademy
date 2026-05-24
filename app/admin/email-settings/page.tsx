import { requireAdminSession } from "@/lib/auth";
import { getConfigs } from "@/lib/supabase";
import EmailSettingsClient from "./EmailSettingsClient";

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage() {
  await requireAdminSession();

  const config = await getConfigs([
    "email_from_name",
    "email_booking_to",
    "company_email",
  ]);

  return (
    <EmailSettingsClient
      initialFromName={config.email_from_name ?? ""}
      initialBookingTo={config.email_booking_to ?? ""}
      initialCompanyEmail={config.company_email ?? ""}
    />
  );
}
