import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { LogoIntro } from "@/components/layout/LogoIntro";
import { SITE_NAME, SITE_DESCRIPTION, SITE_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.greenfreightacademy.co.za"),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "green freight training",
    "road freight academy",
    "truck driver training South Africa",
    "eco-driver training",
    "fleet capability",
    "green road freight management",
    "electric truck training",
    "green freight procurement",
    "freight certification",
    "RTMS training",
    "fleet management South Africa",
    "professional driver development",
    "road freight South Africa",
    "transport manager training",
  ],
  authors: [{ name: "Green Freight Academy", url: "https://www.greenfreightacademy.co.za" }],
  creator: "Green Freight Academy",
  publisher: "Green Freight Academy",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: "en_ZA",
    url: "https://www.greenfreightacademy.co.za",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Green Freight Academy — Specialist Training for Road Freight",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://www.greenfreightacademy.co.za",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Green Freight Academy",
  alternateName: "GFA",
  url: "https://www.greenfreightacademy.co.za",
  logo: "https://www.greenfreightacademy.co.za/og-image.png",
  description:
    "Green Freight Academy is South Africa's specialist capability platform for the road freight sector — providing practical training, certification, and development programmes for drivers, fleet managers, and transport leaders.",
  address: {
    "@type": "PostalAddress",
    addressCountry: "ZA",
  },
  sameAs: [
    "https://www.linkedin.com/company/green-freight-academy",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Green Freight Academy",
  url: "https://www.greenfreightacademy.co.za",
  description:
    "South Africa's specialist capability platform for the road freight sector.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        <LogoIntro logoSrc="/tag-logo.png" />
        <Navigation />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
