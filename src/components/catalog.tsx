"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  NO_GRAMS,
  defaultFilters,
  filterCatalog,
  parseFilters,
  serializeFilters,
  sortCatalog,
  type CatalogFilters,
  type CategoryFilter,
  type GrindFilter,
  type SortKey,
} from "@/lib/filter-catalog";
import { availableGrams } from "@/lib/format";
import type { CatalogMeta } from "@/lib/catalog";
import type { Product, StoreId } from "@/lib/types";
import { ProductCard } from "./product-card";
import { UpdatedBadge } from "./updated-badge";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "price_per_kg-asc", label: "Menor precio por kg" },
  { value: "price_per_kg-desc", label: "Mayor precio por kg" },
  { value: "price-asc", label: "Menor precio" },
  { value: "price-desc", label: "Mayor precio" },
  { value: "name-asc", label: "Nombre (A-Z)" },
  { value: "roaster-asc", label: "Tostador (A-Z)" },
];

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "Todos los cafés" },
  { value: "single-origin", label: "Single origin" },
  { value: "blend", label: "Blend" },
];

const GRIND_OPTIONS: { value: GrindFilter; label: string }[] = [
  { value: "all", label: "Cualquier molienda" },
  { value: "whole-bean", label: "En grano" },
  { value: "ground", label: "Molido" },
];

const SELECT_CLASS =
  "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground";

function chipClass(active: boolean): string {
  return [
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
    active
      ? "border-accent bg-accent text-background"
      : "border-line bg-surface text-foreground hover:border-accent",
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
    const map = new Map<StoreId, string>();
    for (const product of products) {
      if (!map.has(product.store)) map.set(product.store, product.roaster);
    }
    return [...map.entries()];
  }, [products]);

  const gramSizes = useMemo(() => availableGrams(products), [products]);
  const hasNullGrams = useMemo(
    () => products.some((product) => product.grams === null),
    [products],
  );

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
      <div className="sticky top-0 z-20 -mx-4 border-b border-line bg-background/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={filters.q}
            onChange={(event) => applyFilters({ ...filters, q: event.target.value })}
            placeholder="Buscar café, origen o tostador…"
            aria-label="Buscar productos"
            className="w-full rounded-lg border border-line bg-surface px-4 py-2 text-sm text-foreground placeholder:text-muted"
          />
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className={`${filtersOpen ? "border-accent text-accent" : "border-line text-foreground"} rounded-lg border bg-surface px-3 py-2 text-sm font-medium md:hidden`}
          >
            Filtros
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 text-sm text-muted">
          <span>
            {visible.length} {visible.length === 1 ? "producto" : "productos"}
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

          <div className="flex flex-wrap gap-1.5">
            {gramSizes.map((grams) => (
              <button
                key={grams}
                type="button"
                onClick={() => toggleGram(grams)}
                aria-pressed={filters.grams.includes(grams)}
                className={chipClass(filters.grams.includes(grams))}
              >
                {grams >= 1000 ? `${grams / 1000} kg` : `${grams} g`}
              </button>
            ))}
            {hasNullGrams && (
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
              aria-label="Molienda"
              value={filters.grind}
              onChange={(event) =>
                applyFilters({ ...filters, grind: event.target.value as GrindFilter })
              }
              className={SELECT_CLASS}
            >
              {GRIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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

            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={filters.includeEquipment}
                onChange={(event) =>
                  applyFilters({ ...filters, includeEquipment: event.target.checked })
                }
                className="h-4 w-4 accent-accent"
              />
              Mostrar máquinas y accesorios
            </label>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center">
          <p className="font-serif text-xl text-foreground">
            No encontramos cafés con esos filtros
          </p>
          <button
            type="button"
            onClick={() => applyFilters(defaultFilters())}
            className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-strong"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
