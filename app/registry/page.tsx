import type { Metadata } from "next";
import RegistryPageClient from "./RegistryPageClient";

export const metadata: Metadata = {
  title: "Driver Registry | Verify Certified Drivers",
  description:
    "Search the Green Freight Academy registry to verify certified professional drivers. Employers and fleet operators can confirm driver training completion, certification status, and programme history.",
  keywords: [
    "driver registry South Africa",
    "verify certified driver",
    "professional driver certification check",
    "truck driver certification South Africa",
    "green freight academy driver registry",
    "certified driver verification",
  ],
  openGraph: {
    title: "Driver Registry | Green Freight Academy",
    description:
      "Verify certified professional drivers in the Green Freight Academy registry. Search by ID number or name to confirm training and certification status.",
    url: "https://www.greenfreightacademy.co.za/registry",
  },
  alternates: {
    canonical: "https://www.greenfreightacademy.co.za/registry",
  },
};

export default function RegistryPage() {
  return <RegistryPageClient />;
}
