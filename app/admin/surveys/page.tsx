import { requireAdminSession } from "@/lib/auth";
import SurveysAdminClient from "./SurveysAdminClient";
export const dynamic = "force-dynamic";
export const metadata = { title: "Survey Questions — Admin" };

export default async function SurveysAdminPage() {
  await requireAdminSession();
  return <SurveysAdminClient />;
}
