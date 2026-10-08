import { Suspense } from "react";
import { getCatalog, getCatalogMeta } from "@/lib/catalog";
import { Catalog } from "@/components/catalog";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { STORES } from "@/scrapers/stores";

function Ticker({ roasterCount }: { roasterCount: number }) {
  const items = [
    `${roasterCount} tostadores`,
    "precios actualizados todos los días",
    "precio por kilo comparable",
    "café de especialidad, blends y equipo",
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

function EmptyCatalog() {
  return (
    <div className="mt-8 rounded-3xl border border-dashed border-line bg-surface p-12 text-center">
      <p className="font-display text-2xl text-foreground">Todavía no hay datos</p>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">
        Esperá al próximo scrapeo: los precios se actualizan solos todos los días.
      </p>
    </div>
  );
}

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Quiero Café",
  url: "https://quierocafe.vercel.app",
  inLanguage: "es-AR",
  description:
    "Comparador de precios de café de especialidad de tostadores argentinos, con precio por kilo comparable.",
};

export default async function Home() {
  const products = await getCatalog();
  const meta = await getCatalogMeta();
  const roasterCount = STORES.length;

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
      />
      <header className="border-b border-line">
        <Ticker roasterCount={roasterCount} />
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
            Comparador de precios
          </p>
          <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[0.92] tracking-[-0.035em] text-foreground sm:text-7xl lg:text-8xl">
            Quiero{" "}
            <span className="text-accent themed:inline-block themed:bg-linear-to-r themed:from-accent themed:to-accent-strong themed:bg-clip-text themed:text-transparent">
              Cafe
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Precios de café de especialidad de {roasterCount} tostadores argentinos, directo
            desde sus tiendas.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 sm:px-6">
        {products.length === 0 ? (
          <EmptyCatalog />
        ) : (
          <Suspense fallback={<SkeletonGrid />}>
            <Catalog products={products} meta={meta} />
          </Suspense>
        )}
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 sm:px-6">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-foreground">
            Quiero Cafe
          </p>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Los precios se actualizan solos todos los días, directo desde las tiendas de cada
            tostador, así siempre comparás el último valor por kilo.
          </p>
        </div>
      </footer>

      {process.env.NODE_ENV !== "production" && <ThemeSwitcher />}
    </div>
  );
}
