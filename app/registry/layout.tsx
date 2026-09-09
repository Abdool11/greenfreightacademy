import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Certificate Verification | Green Freight Academy",
  description: "Verify the current status of a Green Freight Academy certificate using its exact certificate number.",
};

export default function RegistryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
