"use client";

import { formatGrams } from "@/lib/format";
import {
  NO_GRAMS,
  type CatalogFilters,
  type CategoryFilter,
  type GramFacetOptions,
  type SortKey,
} from "@/lib/filter-catalog";
import type { Dictionary } from "@/i18n/dictionaries/types";
import type { StoreId } from "@/lib/types";
import { CATEGORY_KEYS, SELECT_CLASS, SORT_KEYS, chipClass } from "./catalog.constants";

interface CatalogFiltersPanelProps {
  filters: CatalogFilters;
  roasterChips: [StoreId, string][];
  gramFacet: GramFacetOptions;
  originOptions: string[];
  open: boolean;
  onToggleRoaster: (store: StoreId) => void;
  onToggleGram: (grams: number) => void;
  onApply: (next: CatalogFilters) => void;
  t: Dictionary["catalog"];
}

export function CatalogFiltersPanel({
  filters,
  roasterChips,
  gramFacet,
  originOptions,
  open,
  onToggleRoaster,
  onToggleGram,
  onApply,
  t,
}: CatalogFiltersPanelProps) {
  return (
    <div className={`${open ? "flex" : "hidden"} md:flex flex-col gap-3 pt-3`}>
      <div className="flex flex-wrap gap-1.5">
        {roasterChips.map(([store, roaster]) => (
          <button
            key={store}
            type="button"
            onClick={() => onToggleRoaster(store)}
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
            onClick={() => onToggleGram(grams)}
            aria-pressed={filters.grams.includes(grams)}
            className={`${chipClass(filters.grams.includes(grams))} font-mono tabular-nums`}
          >
            {formatGrams(grams)}
          </button>
        ))}
        {gramFacet.hasNull && (
          <button
            type="button"
            onClick={() => onToggleGram(NO_GRAMS)}
            aria-pressed={filters.grams.includes(NO_GRAMS)}
            className={chipClass(filters.grams.includes(NO_GRAMS))}
          >
            {t.noWeight}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={t.categoryLabel}
          value={filters.category}
          onChange={(event) =>
            onApply({ ...filters, category: event.target.value as CategoryFilter })
          }
          className={SELECT_CLASS}
        >
          {CATEGORY_KEYS.map((value) => (
            <option key={value} value={value}>
              {t.category[value]}
            </option>
          ))}
        </select>

        <select
          aria-label={t.originLabel}
          value={filters.origin}
          onChange={(event) => onApply({ ...filters, origin: event.target.value })}
          className={SELECT_CLASS}
        >
          <option value="all">{t.allCountries}</option>
          {originOptions.map((origin) => (
            <option key={origin} value={origin}>
              {origin}
            </option>
          ))}
        </select>

        <select
          aria-label={t.sortLabel}
          value={filters.sort}
          onChange={(event) => onApply({ ...filters, sort: event.target.value as SortKey })}
          className={SELECT_CLASS}
        >
          {SORT_KEYS.map((value) => (
            <option key={value} value={value}>
              {t.sort[value]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
