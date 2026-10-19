import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

const SITE_URL = "https://www.quierocafe.shop";

const routes = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "about", changeFrequency: "monthly", priority: 0.3 },
  { path: "contact", changeFrequency: "monthly", priority: 0.3 },
  { path: "privacy", changeFrequency: "monthly", priority: 0.3 },
  { path: "terms", changeFrequency: "monthly", priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return locales.flatMap((locale) =>
    routes.map((route) => {
      const suffix = route.path ? `/${route.path}` : "";

      return {
        url: `${SITE_URL}/${locale}${suffix}`,
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      };
    }),
  );
}
