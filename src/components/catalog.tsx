"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  NO_GRAMS,
  defaultFilters,
  filterCatalog,
  gramFacetOptions,
  parseFilters,
  roasterFacetOptions,
  serializeFilters,
  sortCatalog,
  type CatalogFilters,
  type CategoryFilter,
  type SortKey,
} from "@/lib/filter-catalog";
import type { CatalogMeta } from "@/lib/catalog";
import { formatGrams } from "@/lib/format";
import type { Product, StoreId } from "@/lib/types";
import { ProductCard } from "./product-card";
import { UpdatedBadge } from "./updated-badge";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "price_per_kg-desc", label: "Mayor precio por kg" },
  { value: "price_per_kg-asc", label: "Menor precio por kg" },
  { value: "grams-desc", label: "Mayor gramaje" },
  { value: "grams-asc", label: "Menor gramaje" },
  { value: "price-desc", label: "Mayor precio" },
  { value: "price-asc", label: "Menor precio" },
  { value: "name-asc", label: "Nombre (A-Z)" },
  { value: "roaster-asc", label: "Tostador (A-Z)" },
];

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "Todos los cafés" },
  { value: "single-origin", label: "Single origin" },
  { value: "blend", label: "Blend" },
  { value: "equipment", label: "Herramientas y accesorios" },
];

const SELECT_CLASS =
  "w-full rounded-full border border-line bg-surface px-4 py-2 text-sm text-foreground transition-colors duration-200 hover:border-accent sm:w-auto";

function chipClass(active: boolean): string {
  return [
    "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200",
    active
      ? "border-accent bg-accent text-on-accent shadow-sm"
      : "border-line bg-surface text-foreground hover:-translate-y-0.5 hover:border-accent hover:text-accent",
  ].join(" ");
}

export function Catalog({
  products,
  meta,
}: {
  products: Product[];
  meta: CatalogMeta;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [filters, setFilters] = useState<CatalogFilters>(() =>
    parseFilters(Object.fromEntries(searchParams)),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    <section aria-label="Catálogo de cafés">
      <div className="-mx-4 border-b border-line bg-background px-4 pb-3 pt-3 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={filters.q}
            onChange={(event) => applyFilters({ ...filters, q: event.target.value })}
            placeholder="Buscar café, origen o tostador…"
            aria-label="Buscar productos"
            className="w-full rounded-full border border-line bg-surface px-5 py-2.5 text-sm text-foreground transition-colors duration-200 placeholder:text-muted hover:border-accent"
          />
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className={`${filtersOpen ? "border-accent text-accent" : "border-line text-foreground"} shrink-0 rounded-full border bg-surface px-4 py-2.5 text-sm font-semibold transition-colors duration-200 md:hidden`}
          >
            Filtros
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 text-sm text-muted">
          <span className="text-xs font-semibold uppercase tracking-[0.14em]">
            <span className="font-mono tabular-nums">{visible.length}</span>{" "}
            {visible.length === 1 ? "producto" : "productos"}
          </span>
          <UpdatedBadge updatedAt={meta.updatedAt} />
        </div>

        <div
          className={`${filtersOpen ? "flex" : "hidden"} md:flex flex-col gap-3 pt-3`}
        >
          <div className="flex flex-wrap gap-1.5">
            {roasterChips.map(([store, roaster]) => (
              <button
                key={store}
                type="button"
                onClick={() => toggleRoaster(store)}
                aria-pressed={filters.roasters.includes(store)}
                className={chipClass(filters.roasters.includes(store))}
              >
                {roaster}
              </button>
            ))}
          </div>

          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {gramFacet.values.map((grams) => (
              <button
                key={grams}
                type="button"
                onClick={() => toggleGram(grams)}
                aria-pressed={filters.grams.includes(grams)}
                className={`${chipClass(filters.grams.includes(grams))} font-mono tabular-nums`}
              >
                {formatGrams(grams)}
              </button>
            ))}
            {gramFacet.hasNull && (
              <button
                type="button"
                onClick={() => toggleGram(NO_GRAMS)}
                aria-pressed={filters.grams.includes(NO_GRAMS)}
                className={chipClass(filters.grams.includes(NO_GRAMS))}
              >
                sin gramaje
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Categoría"
              value={filters.category}
              onChange={(event) =>
                applyFilters({ ...filters, category: event.target.value as CategoryFilter })
              }
              className={SELECT_CLASS}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              aria-label="País de origen"
              value={filters.origin}
              onChange={(event) => applyFilters({ ...filters, origin: event.target.value })}
              className={SELECT_CLASS}
            >
              <option value="all">Todos los países</option>
              {originOptions.map((origin) => (
                <option key={origin} value={origin}>
                  {origin}
                </option>
              ))}
            </select>

            <select
              aria-label="Ordenar por"
              value={filters.sort}
              onChange={(event) =>
                applyFilters({ ...filters, sort: event.target.value as SortKey })
              }
              className={SELECT_CLASS}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-line bg-surface p-12 text-center">
          <p className="font-display text-2xl text-foreground">
            No encontramos cafés con esos filtros
          </p>
          <button
            type="button"
            onClick={() => applyFilters(defaultFilters())}
            className="mt-5 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong hover:shadow-md"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
