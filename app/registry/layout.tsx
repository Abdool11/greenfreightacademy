import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registry of Professional Drivers",
  description:
    "Search and verify certifications for GreenFreightAcademy-trained drivers. Publicly accessible to employers, fleet operators, and compliance auditors.",
};

export default function RegistryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
