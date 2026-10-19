import type { FetchFn } from "./http";

export interface TiendanubeScrapeDeps {
  fetchFn?: FetchFn;
  delayFn?: (ms: number) => Promise<void>;
}

export interface TiendanubeVariant {
  sku?: string;
  available?: boolean;
  option0?: string | null;
  option1?: string | null;
  option2?: string | null;
  price_number?: number;
  has_promotional_price?: boolean;
  promotional_price_number?: number | null;
  installments_data?: string;
}
