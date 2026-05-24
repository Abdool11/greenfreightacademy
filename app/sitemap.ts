import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.greenfreightacademy.co.za";
  const now = new Date();

  const pages = [
    { url: "/", priority: 1.0, changeFrequency: "weekly" as const },
    { url: "/programmes", priority: 0.9, changeFrequency: "monthly" as const },
    { url: "/pricing", priority: 0.8, changeFrequency: "monthly" as const },
    { url: "/publications", priority: 0.7, changeFrequency: "monthly" as const },
    { url: "/registry", priority: 0.7, changeFrequency: "weekly" as const },
    { url: "/about", priority: 0.6, changeFrequency: "monthly" as const },
    { url: "/contact", priority: 0.5, changeFrequency: "yearly" as const },
  ];

  return pages.map(({ url, priority, changeFrequency }) => ({
    url: `${base}${url}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
