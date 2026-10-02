import { Suspense } from "react";
import { getCatalog, getCatalogMeta } from "@/lib/catalog";
import { Catalog } from "@/components/catalog";
import { UpdatedBadge } from "@/components/updated-badge";

function SkeletonGrid() {
  return (
    <div
      className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface"
        >
          <div className="image-placeholder h-44 w-full opacity-60" />
          <div className="flex flex-col gap-3 p-4">
            <div className="h-3 w-24 rounded bg-line" />
            <div className="h-5 w-3/4 rounded bg-line" />
            <div className="h-4 w-32 rounded bg-line" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyCatalog() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-10 text-center">
      <p className="font-serif text-xl text-foreground">Todavía no hay datos</p>
      <p className="mt-2 text-sm text-muted">
        Esperá al próximo scrapeo: los precios se actualizan solos cada hora.
      </p>
    </div>
  );
}

export default async function Home() {
  const products = await getCatalog();
  const meta = await getCatalogMeta();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
                Coffee Price
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted sm:text-base">
                Precios de café de especialidad en Argentina, comparados por kilo.
              </p>
            </div>
            <UpdatedBadge updatedAt={meta.updatedAt} />
          </div>
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

      <footer className="border-t border-line">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted sm:px-6">
          Los precios se actualizan automáticamente cada hora, directo desde las tiendas de
          cada tostador.
        </p>
      </footer>
    </div>
  );
}
