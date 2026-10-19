import { availableGrams, bucketGrams, sortGramValues } from "@/lib/format";
import type { Product, StoreId } from "@/lib/types";
import { normalize } from "./filter-catalog.helpers";
import type {
  CatalogFilters,
  CategoryFilter,
  GramFacetOptions,
  SortKey,
} from "./filter-catalog.types";

export {
  defaultFilters,
  parseFilters,
  serializeFilters,
} from "./filter-catalog.helpers";
export type {
  CatalogFilters,
  CategoryFilter,
  GramFacetOptions,
  SortKey,
} from "./filter-catalog.types";

export const NO_GRAMS = -1;

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
