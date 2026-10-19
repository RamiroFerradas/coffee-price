import type { FetchFn } from "./http";

export interface WooPrices {
  price?: string;
  currency_minor_unit?: number;
}

export interface WooAttributeTerm {
  name?: string;
  slug?: string;
  default?: boolean;
}

export interface WooAttribute {
  name?: string;
  taxonomy?: string;
  terms?: WooAttributeTerm[];
}

export interface WooVariationRef {
  id?: number;
  attributes?: { name?: string; value?: string }[];
}

export interface WooProduct {
  id?: number;
  name?: string;
  slug?: string;
  permalink?: string;
  sku?: string;
  is_in_stock?: boolean;
  prices?: WooPrices;
  attributes?: WooAttribute[];
  variations?: WooVariationRef[];
  weight?: unknown;
  images?: { src?: string }[];
  categories?: { name?: string }[];
  short_description?: string;
}

export interface WooApiScrapeDeps {
  fetchFn?: FetchFn;
}
