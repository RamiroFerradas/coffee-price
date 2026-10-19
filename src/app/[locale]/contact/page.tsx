import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrustPage } from "@/components/trust-page";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { buildPageMetadata } from "@/i18n/metadata";

const GITHUB_ISSUES_URL =
  "https://github.com/RamiroFerradas/coffee-price/issues";

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

  const { contact } = getDictionary(locale).trust;
  return buildPageMetadata(
    locale,
    "contact",
    contact.metaTitle,
    contact.metaDescription,
  );
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <TrustPage locale={locale} content={getDictionary(locale).trust.contact}>
      <a
        href={GITHUB_ISSUES_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex break-all rounded-2xl border border-line bg-surface px-5 py-4 font-mono text-sm text-accent-strong underline-offset-4 transition-colors hover:text-accent hover:underline"
      >
        {GITHUB_ISSUES_URL}
      </a>
    </TrustPage>
  );
}
