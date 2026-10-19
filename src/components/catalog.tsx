"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  defaultFilters,
  filterCatalog,
  gramFacetOptions,
  parseFilters,
  roasterFacetOptions,
  serializeFilters,
  sortCatalog,
  type CatalogFilters,
} from "@/lib/filter-catalog";
import type { CatalogMeta } from "@/lib/catalog";
import { PAGE_SIZE } from "@/lib/pagination";
import type { Product, StoreId } from "@/lib/types";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { CatalogFiltersPanel } from "./catalog-filters";
import { CatalogResults } from "./catalog-results";
import { CatalogToolbar } from "./catalog-toolbar";

export function Catalog({
  products,
  meta,
  locale,
}: {
  products: Product[];
  meta: CatalogMeta;
  locale: Locale;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const t = getDictionary(locale).catalog;

  const [filters, setFilters] = useState<CatalogFilters>(() =>
    parseFilters(Object.fromEntries(searchParams)),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Collapse to one page whenever filters/search/sort change
  // (https://react.dev/reference/react/useState#storing-information-from-previous-renders).
  const [prevFilters, setPrevFilters] = useState(filters);
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    setVisibleCount(PAGE_SIZE);
  }

  const applyFilters = useCallback(
    (next: CatalogFilters) => {
      setFilters(next);
      const query = new URLSearchParams(serializeFilters(next)).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const roasterChips = useMemo(() => {
    const names = new Map<StoreId, string>();
    for (const product of products) {
      if (!names.has(product.store)) names.set(product.store, product.roaster);
    }
    const chips: [StoreId, string][] = [];
    for (const store of roasterFacetOptions(products, filters)) {
      const name = names.get(store);
      if (name !== undefined) chips.push([store, name]);
    }
    return chips;
  }, [products, filters]);

  const gramFacet = useMemo(() => gramFacetOptions(products, filters), [products, filters]);

  const originOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const product of products) {
      if (product.origin !== null) unique.add(product.origin);
    }
    return [...unique].sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const visible = useMemo(
    () => sortCatalog(filterCatalog(products, filters), filters.sort),
    [products, filters],
  );

  const toggleRoaster = (store: StoreId) => {
    const roasters = filters.roasters.includes(store)
      ? filters.roasters.filter((entry) => entry !== store)
      : [...filters.roasters, store];
    applyFilters({ ...filters, roasters });
  };

  const toggleGram = (grams: number) => {
    const next = filters.grams.includes(grams)
      ? filters.grams.filter((entry) => entry !== grams)
      : [...filters.grams, grams];
    applyFilters({ ...filters, grams: next });
  };

  return (
    <section aria-label={t.sectionAria}>
      <div className="-mx-4 border-b border-line bg-background px-4 pb-3 pt-3 sm:-mx-6 sm:px-6">
        <CatalogToolbar
          query={filters.q}
          visibleCount={visible.length}
          updatedAt={meta.updatedAt}
          locale={locale}
          open={filtersOpen}
          onToggleOpen={() => setFiltersOpen((open) => !open)}
          onSearch={(value) => applyFilters({ ...filters, q: value })}
          t={t}
        />
        <CatalogFiltersPanel
          filters={filters}
          roasterChips={roasterChips}
          gramFacet={gramFacet}
          originOptions={originOptions}
          open={filtersOpen}
          onToggleRoaster={toggleRoaster}
          onToggleGram={toggleGram}
          onApply={applyFilters}
          t={t}
        />
      </div>

      <CatalogResults
        visible={visible}
        visibleCount={visibleCount}
        onVisibleCountChange={setVisibleCount}
        onClear={() => applyFilters(defaultFilters())}
        locale={locale}
        t={t}
      />
    </section>
  );
}
