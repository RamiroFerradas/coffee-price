import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

const SITE_URL = "https://www.quierocafe.shop";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return locales.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified,
    changeFrequency: "daily",
    priority: 1,
  }));
}
