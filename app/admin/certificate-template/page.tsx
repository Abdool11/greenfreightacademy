import { requireAdminSession } from "@/lib/auth";
import CertificateTemplateClient from "./CertificateTemplateClient";
export const dynamic = "force-dynamic";
export const metadata = { title: "Certificate Template — Admin" };

export default async function CertificateTemplatePage() {
  await requireAdminSession();
  return <CertificateTemplateClient />;
}
