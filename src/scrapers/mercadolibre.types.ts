import type { FetchFn } from "./http";

export interface MercadoLibreScrapeDeps {
  fetchFn?: FetchFn;
  delayFn?: (ms: number) => Promise<void>;
}
