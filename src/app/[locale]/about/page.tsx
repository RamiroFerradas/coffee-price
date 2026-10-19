import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrustPage } from "@/components/trust-page";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { buildPageMetadata } from "@/i18n/metadata";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { about } = getDictionary(locale).trust;
  return buildPageMetadata(
    locale,
    "about",
    about.metaTitle,
    about.metaDescription,
  );
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <TrustPage locale={locale} content={getDictionary(locale).trust.about} />
  );
}
