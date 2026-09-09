import type { Metadata } from "next";
import RegistryPageClient from "@/app/registry/RegistryPageClient";

export const metadata: Metadata = {
  title: "Certificate Verification | Green Freight Academy",
  description: "Verify the current status of a Green Freight Academy certificate using its exact certificate number.",
  robots: { index: false, follow: false },
};

export default async function CertificateVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ certificate?: string }>;
}) {
  const { certificate } = await searchParams;
  return <RegistryPageClient initialCertificateNumber={certificate ?? ""} />;
}
