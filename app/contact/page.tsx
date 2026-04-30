import type { Metadata } from "next";
import ContactPageClient from "./ContactPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact Green Freight Academy",
  description:
    "Get in touch with Green Freight Academy to enrol your fleet in a training programme, request a company engagement, or ask about our driver development and certification offerings for road freight businesses.",
  keywords: [
    "contact green freight academy",
    "fleet training enquiry South Africa",
    "truck driver training enquiry",
    "enrol fleet training South Africa",
    "road freight training contact",
  ],
  openGraph: {
    title: "Contact Green Freight Academy",
    description:
      "Enrol your fleet, book a company engagement, or enquire about our training programmes for road freight businesses.",
    url: "https://www.greenfreightacademy.co.za/contact",
  },
  alternates: {
    canonical: "https://www.greenfreightacademy.co.za/contact",
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
