import { STORES } from "@/scrapers/stores";
import { bucketGrams } from "@/lib/format";
import type { StoreId } from "@/lib/types";
import type { CatalogFilters, CategoryFilter, SortKey } from "./filter-catalog.types";

export const SORT_KEYS: readonly SortKey[] = [
  "price_per_kg-asc",
  "price_per_kg-desc",
  "grams-desc",
  "grams-asc",
  "price-asc",
  "price-desc",
  "name-asc",
  "roaster-asc",
];

export const CATEGORIES: readonly CategoryFilter[] = ["all", "single-origin", "blend", "equipment"];
const STORE_IDS: readonly StoreId[] = STORES.map((store) => store.id);

export function isOneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): value is T {
  return value !== undefined && (allowed as readonly string[]).includes(value);
}

export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function paramValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw.flatMap((entry) => entry.split(","));
}

function paramValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseGramsParam(value: string | string[] | undefined): number[] {
  const parsed: number[] = [];
  for (const token of paramValues(value)) {
    if (!/^-?\d+$/.test(token)) continue;
    const grams = Number(token);
    if (Number.isSafeInteger(grams)) parsed.push(grams);
  }
  return normalizeGramValues(parsed);
}

/** Canonicalize a gram selection: bucket sub-kilo values (legacy `?grams=450`
 * bookmarks keep working), keep NO_GRAMS/-1 sentinels untouched, dedupe. */
function normalizeGramValues(values: number[]): number[] {
  const seen = new Set<number>();
  for (const grams of values) {
    seen.add(grams > 0 ? bucketGrams(grams) : grams);
  }
  return [...seen];
}

export function defaultFilters(): CatalogFilters {
  return {
    q: "",
    roasters: [],
    grams: [],
    category: "all",
    origin: "all",
    sort: "price_per_kg-asc",
  };
}

export function parseFilters(params: Record<string, string | string[]>): CatalogFilters {
  const defaults = defaultFilters();

  const roasters: StoreId[] = [];
  for (const token of paramValues(params.roasters)) {
    if (isOneOf(token, STORE_IDS)) roasters.push(token);
  }

  const q = paramValue(params.q);
  const sort = paramValue(params.sort);
  const category = paramValue(params.category);
  const origin = paramValue(params.origin);

  return {
    q: q ?? defaults.q,
    roasters,
    grams: parseGramsParam(params.grams),
    category: isOneOf(category, CATEGORIES) ? category : defaults.category,
    origin: origin || defaults.origin,
    sort: isOneOf(sort, SORT_KEYS) ? sort : defaults.sort,
  };
}

export function serializeFilters(filters: CatalogFilters): Record<string, string> {
  const defaults = defaultFilters();
  const params: Record<string, string> = {};

  if (filters.q !== defaults.q) params.q = filters.q;
  if (filters.roasters.length > 0) params.roasters = filters.roasters.join(",");
  if (filters.grams.length > 0) params.grams = normalizeGramValues(filters.grams).join(",");
  if (filters.category !== defaults.category) params.category = filters.category;
  if (filters.origin !== defaults.origin) params.origin = filters.origin;
  if (filters.sort !== defaults.sort) params.sort = filters.sort;

  return params;
}
