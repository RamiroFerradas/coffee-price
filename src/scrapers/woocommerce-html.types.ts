import type { FetchFn } from "./http";

export interface WooHtmlScrapeDeps {
  fetchFn?: FetchFn;
  delayFn?: (ms: number) => Promise<void>;
}

export interface WooVariation {
  display_price?: number | string;
  weight?: number | string;
  is_in_stock?: boolean;
}
