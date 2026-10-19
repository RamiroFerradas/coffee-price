"use client";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/types";
import { PAGE_SIZE, nextVisibleCount, remainingCount } from "@/lib/pagination";
import type { Product } from "@/lib/types";
import { ProductCard } from "./product-card";

interface CatalogResultsProps {
  visible: Product[];
  visibleCount: number;
  onVisibleCountChange: (count: number) => void;
  onClear: () => void;
  locale: Locale;
  t: Dictionary["catalog"];
}

export function CatalogResults({
  visible,
  visibleCount,
  onVisibleCountChange,
  onClear,
  locale,
  t,
}: CatalogResultsProps) {
  if (visible.length === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-line bg-surface p-12 text-center">
        <p className="font-display text-2xl text-foreground">{t.emptyResults}</p>
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong hover:shadow-md"
        >
          {t.clearFilters}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {visible.slice(0, visibleCount).map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} locale={locale} />
        ))}
      </div>
      {remainingCount(visible.length, visibleCount) > 0 && (
        <div className="flex justify-center pb-8">
          <button
            type="button"
            onClick={() =>
              onVisibleCountChange(nextVisibleCount(visibleCount, visible.length, PAGE_SIZE))
            }
            className="w-full rounded-full border border-line bg-surface px-6 py-2.5 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-accent sm:w-auto"
          >
            {t.loadMore(remainingCount(visible.length, visibleCount))}
          </button>
        </div>
      )}
    </>
  );
}
