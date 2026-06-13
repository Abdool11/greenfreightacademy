import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/_next/",
          "/admin/",
          "/dashboard/",
          "/login/",
          "/register/",
          "/trial/",
        ],
      },
    ],
    sitemap: "https://www.greenfreightacademy.co.za/sitemap.xml",
  };
}
