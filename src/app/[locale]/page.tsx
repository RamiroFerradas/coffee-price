import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCatalog, getCatalogMeta } from "@/lib/catalog";
import { Catalog } from "@/components/catalog";
import { STORES } from "@/scrapers/stores";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { SITE_URL } from "@/i18n/metadata";

// `dynamicParams = false` is unavailable under `cacheComponents`, so unknown
// locales are rejected by the `isLocale` guard below instead.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

function Ticker({ roasterCount, dict }: { roasterCount: number; dict: Dictionary }) {
  const items = [
    dict.ticker.roasters(roasterCount),
    dict.ticker.dailyPrices,
    dict.ticker.comparablePerKg,
    dict.ticker.specialtyBlendsGear,
  ];
  // 4 copies per track, animated to -50% (2 copies): seamless as long as half the
  // track is wider than the viewport.
  const loop = [...items, ...items, ...items, ...items];

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden border-b border-line bg-foreground py-2 text-background"
    >
      <div className="animate-marquee group flex w-max items-center gap-6 group-hover:[animation-play-state:paused]">
        {loop.map((item, index) => (
          <span
            key={`${item}-${index}`}
            // First item of each copy is the roaster count: data numbers in mono.
            className={`flex shrink-0 items-center gap-6 text-[11px] font-bold uppercase tracking-[0.25em] ${
              index % items.length === 0 ? "font-mono tabular-nums" : ""
            }`}
          >
            {item}
            <span className="text-accent">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div
      className="grid grid-cols-1 gap-5 py-8 sm:grid-cols-2 lg:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse overflow-hidden rounded-3xl border border-line bg-surface shadow-sm"
        >
          <div className="image-placeholder h-44 w-full opacity-60" />
          <div className="flex flex-col gap-3 p-5">
            <div className="h-3 w-24 rounded-full bg-line" />
            <div className="h-5 w-3/4 rounded-full bg-line" />
            <div className="h-4 w-32 rounded-full bg-line" />
            <div className="mt-2 h-8 w-40 rounded-full bg-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyCatalog({ dict }: { dict: Dictionary }) {
  return (
    <div className="mt-8 rounded-3xl border border-dashed border-line bg-surface p-12 text-center">
      <p className="font-display text-2xl text-foreground">{dict.emptyCatalog.title}</p>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">{dict.emptyCatalog.body}</p>
    </div>
  );
}

function websiteJsonLd(locale: Locale, siteUrl: string) {
  const { jsonLd } = getDictionary(locale).meta;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: jsonLd.name,
    url: siteUrl,
    inLanguage: jsonLd.inLanguage,
    description: jsonLd.description,
  };
}

export default async function LocalePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const products = await getCatalog();
  const meta = await getCatalogMeta();
  const roasterCount = STORES.length;
  const jsonLd = websiteJsonLd(locale, SITE_URL);

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="border-b border-line">
        <Ticker roasterCount={roasterCount} dict={dict} />
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
            {dict.hero.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[0.92] tracking-[-0.035em] text-foreground sm:text-7xl lg:text-8xl">
            Quiero{" "}
            <span className="text-accent inline-block bg-linear-to-r from-accent to-accent-strong bg-clip-text text-transparent">
              Cafe
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            {dict.hero.description(roasterCount)}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 sm:px-6">
        {products.length === 0 ? (
          <EmptyCatalog dict={dict} />
        ) : (
          <Suspense fallback={<SkeletonGrid />}>
            <Catalog products={products} meta={meta} locale={locale} />
          </Suspense>
        )}
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 sm:px-6">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
            Quiero Cafe
          </p>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            {dict.footer.description}
          </p>
        </div>
      </footer>
    </div>
  );
}
