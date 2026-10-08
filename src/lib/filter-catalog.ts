import { STORES } from "@/scrapers/stores";
import { availableGrams, bucketGrams, sortGramValues } from "@/lib/format";
import type { Product, StoreId } from "@/lib/types";

export type SortKey =
  | "price_per_kg-asc"
  | "price_per_kg-desc"
  | "grams-desc"
  | "grams-asc"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "roaster-asc";

export type CategoryFilter = "all" | "single-origin" | "blend" | "equipment";

export interface CatalogFilters {
  q: string;
  roasters: StoreId[];
  grams: number[];
  category: CategoryFilter;
  origin: "all" | string;
  sort: SortKey;
}

export const NO_GRAMS = -1;

const SORT_KEYS: readonly SortKey[] = [
  "price_per_kg-asc",
  "price_per_kg-desc",
  "grams-desc",
  "grams-asc",
  "price-asc",
  "price-desc",
  "name-asc",
  "roaster-asc",
];

const CATEGORIES: readonly CategoryFilter[] = ["all", "single-origin", "blend", "equipment"];
const STORE_IDS: readonly StoreId[] = STORES.map((store) => store.id);

function isOneOf<T extends string>(value: string | undefined, allowed: readonly T[]): value is T {
  return value !== undefined && (allowed as readonly string[]).includes(value);
}

function normalize(text: string): string {
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

function matchesQuery(product: Product, query: string): boolean {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = [
    product.name,
    product.origin,
    product.variety,
    product.roaster,
    product.tasting_notes,
    product.process,
    product.roast_level,
  ].map((field) => (field ? normalize(field) : ""));
  return tokens.every((token) => haystack.some((field) => field.includes(token)));
}

function matchesCategory(product: Product, category: CategoryFilter): boolean {
  if (category === "all") return product.category !== "equipment";
  return product.category === category;
}

export function filterCatalog(products: Product[], filters: CatalogFilters): Product[] {
  return products.filter((product) => {
    if (!product.in_stock) return false;
    if (filters.roasters.length > 0 && !filters.roasters.includes(product.store)) return false;

    if (filters.grams.length > 0) {
      const match =
        product.grams === null
          ? filters.grams.includes(NO_GRAMS)
          : filters.grams.includes(bucketGrams(product.grams));
      if (!match) return false;
    }

    if (!matchesCategory(product, filters.category)) return false;
    if (filters.origin !== "all" && product.origin?.toLowerCase() !== filters.origin.toLowerCase()) return false;
    if (!matchesQuery(product, filters.q)) return false;

    return true;
  });
}

export interface GramFacetOptions {
  values: number[];
  hasNull: boolean;
}

export function gramFacetOptions(products: Product[], filters: CatalogFilters): GramFacetOptions {
  const pool = filterCatalog(products, { ...filters, grams: [] });
  const values = sortGramValues([
    ...availableGrams(pool).map((grams) => bucketGrams(grams)),
    ...filters.grams.filter((grams) => grams > 0),
  ]);
  const hasNull = pool.some((product) => product.grams === null) || filters.grams.includes(NO_GRAMS);
  return { values, hasNull };
}

export function roasterFacetOptions(products: Product[], filters: CatalogFilters): StoreId[] {
  const allowed = new Set(filterCatalog(products, { ...filters, roasters: [] }).map((p) => p.store));
  const options: StoreId[] = [];
  const seen = new Set<StoreId>();
  for (const product of products) {
    if (seen.has(product.store)) continue;
    seen.add(product.store);
    if (allowed.has(product.store) || filters.roasters.includes(product.store)) {
      options.push(product.store);
    }
  }
  return options;
}

type Comparator = (a: Product, b: Product) => number;

function byPricePerKg(descending: boolean): Comparator {
  return (a, b) => {
    if (a.price_per_kg === null && b.price_per_kg === null) return 0;
    if (a.price_per_kg === null) return 1;
    if (b.price_per_kg === null) return -1;
    return descending ? b.price_per_kg - a.price_per_kg : a.price_per_kg - b.price_per_kg;
  };
}

function byGrams(descending: boolean): Comparator {
  return (a, b) => {
    if (a.grams === null && b.grams === null) return 0;
    if (a.grams === null) return 1;
    if (b.grams === null) return -1;
    return descending ? b.grams - a.grams : a.grams - b.grams;
  };
}

const COMPARATORS: Record<SortKey, Comparator> = {
  "price_per_kg-asc": byPricePerKg(false),
  "price_per_kg-desc": byPricePerKg(true),
  "grams-desc": byGrams(true),
  "grams-asc": byGrams(false),
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  "name-asc": (a, b) => a.name.localeCompare(b.name, "es"),
  "roaster-asc": (a, b) => a.roaster.localeCompare(b.roaster, "es"),
};

export function sortCatalog(products: Product[], sort: SortKey): Product[] {
  const compare = COMPARATORS[sort];
  return products
    .map((product, index) => ({ product, index }))
    .sort((a, b) => compare(a.product, b.product) || a.index - b.index)
    .map(({ product }) => product);
}
