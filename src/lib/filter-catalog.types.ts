import type { StoreId } from "@/lib/types";

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

export interface GramFacetOptions {
  values: number[];
  hasNull: boolean;
}
