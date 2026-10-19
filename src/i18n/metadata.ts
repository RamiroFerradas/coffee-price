import type { Metadata } from "next";
import { type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export const SITE_URL = "https://www.quierocafe.shop";
export const SITE_NAME = "Quiero Café";

function buildAlternates(locale: Locale, path: string): Metadata["alternates"] {
  const suffix = path ? `/${path}` : "";

  return {
    canonical: `/${locale}${suffix}`,
    languages: {
      es: `/es${suffix}`,
      en: `/en${suffix}`,
      "x-default": `/es${suffix}`,
    },
  };
}

export function buildMetadata(locale: Locale): Metadata {
  const { title, description, keywords } = getDictionary(locale).meta;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    applicationName: SITE_NAME,
    keywords,
    alternates: buildAlternates(locale, ""),
    openGraph: {
      type: "website",
      locale: locale === "es" ? "es_AR" : "en_US",
      url: SITE_URL,
      siteName: SITE_NAME,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function buildPageMetadata(
  locale: Locale,
  path: string,
  title: string,
  description: string,
): Metadata {
  const suffix = path ? `/${path}` : "";

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    applicationName: SITE_NAME,
    alternates: buildAlternates(locale, path),
    openGraph: {
      type: "website",
      locale: locale === "es" ? "es_AR" : "en_US",
      url: `${SITE_URL}/${locale}${suffix}`,
      siteName: SITE_NAME,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
