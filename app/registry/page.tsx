import type { Metadata } from "next";
import RegistryPageClient from "./RegistryPageClient";

export const metadata: Metadata = {
  title: "Certificate Verification | Green Freight Academy",
  description: "Verify the current status of a Green Freight Academy certificate using its exact certificate number.",
  keywords: [
    "GFA certificate verification",
    "Green Freight Academy certificate",
    "professional driver certificate verification",
  ],
  openGraph: {
    title: "Certificate Verification | Green Freight Academy",
    description: "Verify the current status of a Green Freight Academy certificate using its exact certificate number.",
    url: "https://www.greenfreightacademy.co.za/registry",
  },
  alternates: {
    canonical: "https://www.greenfreightacademy.co.za/registry",
  },
};

export default function RegistryPage() {
  return <RegistryPageClient />;
}
