import { STORES } from "@/scrapers/stores";
import type { Product, StoreId } from "@/lib/types";

export type SortKey =
  | "price_per_kg-asc"
  | "price_per_kg-desc"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "roaster-asc";

export type CategoryFilter = "all" | "single-origin" | "blend";
export type GrindFilter = "all" | "whole-bean" | "ground";

export interface CatalogFilters {
  q: string;
  roasters: StoreId[];
  grams: number[];
  category: CategoryFilter;
  grind: GrindFilter;
  sort: SortKey;
  includeEquipment: boolean;
}

export const NO_GRAMS = -1;

const SORT_KEYS: readonly SortKey[] = [
  "price_per_kg-asc",
  "price_per_kg-desc",
  "price-asc",
  "price-desc",
  "name-asc",
  "roaster-asc",
];

const CATEGORIES: readonly CategoryFilter[] = ["all", "single-origin", "blend"];
const GRINDS: readonly GrindFilter[] = ["all", "whole-bean", "ground"];
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
  return parsed;
}

export function defaultFilters(): CatalogFilters {
  return {
    q: "",
    roasters: [],
    grams: [],
    category: "all",
    grind: "all",
    sort: "price_per_kg-asc",
    includeEquipment: false,
  };
}

export function parseFilters(params: Record<string, string | string[]>): CatalogFilters {
  const defaults = defaultFilters();

  const roasters: StoreId[] = [];
  for (const token of paramValues(params.roasters)) {
    if (isOneOf(token, STORE_IDS)) roasters.push(token);
  }

  const q = paramValue(params.q);
  const includeEquipment = paramValue(params.includeEquipment);
  const sort = paramValue(params.sort);
  const category = paramValue(params.category);
  const grind = paramValue(params.grind);

  return {
    q: q ?? defaults.q,
    roasters,
    grams: parseGramsParam(params.grams),
    category: isOneOf(category, CATEGORIES) ? category : defaults.category,
    grind: isOneOf(grind, GRINDS) ? grind : defaults.grind,
    sort: isOneOf(sort, SORT_KEYS) ? sort : defaults.sort,
    includeEquipment: includeEquipment === "1" || includeEquipment === "true",
  };
}

export function serializeFilters(filters: CatalogFilters): Record<string, string> {
  const defaults = defaultFilters();
  const params: Record<string, string> = {};

  if (filters.q !== defaults.q) params.q = filters.q;
  if (filters.roasters.length > 0) params.roasters = filters.roasters.join(",");
  if (filters.grams.length > 0) params.grams = filters.grams.join(",");
  if (filters.category !== defaults.category) params.category = filters.category;
  if (filters.grind !== defaults.grind) params.grind = filters.grind;
  if (filters.sort !== defaults.sort) params.sort = filters.sort;
  if (filters.includeEquipment !== defaults.includeEquipment) params.includeEquipment = "1";

  return params;
}

function matchesQuery(product: Product, query: string): boolean {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = [product.name, product.origin, product.variety, product.roaster].map((field) =>
    field ? normalize(field) : "",
  );
  return tokens.every((token) => haystack.some((field) => field.includes(token)));
}

export function filterCatalog(products: Product[], filters: CatalogFilters): Product[] {
  return products.filter((product) => {
    if (product.category === "equipment" && !filters.includeEquipment) return false;
    if (filters.roasters.length > 0 && !filters.roasters.includes(product.store)) return false;

    if (filters.grams.length > 0) {
      const match = product.grams === null ? filters.grams.includes(NO_GRAMS) : filters.grams.includes(product.grams);
      if (!match) return false;
    }

    if (filters.category !== "all" && product.category !== filters.category) return false;
    if (filters.grind !== "all" && product.grind !== filters.grind) return false;
    if (!matchesQuery(product, filters.q)) return false;

    return true;
  });
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

const COMPARATORS: Record<SortKey, Comparator> = {
  "price_per_kg-asc": byPricePerKg(false),
  "price_per_kg-desc": byPricePerKg(true),
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
