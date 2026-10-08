import type { RawProduct, StoreId } from "@/lib/types";
import { enrich } from "./enrich";
import type { FetchFn } from "./http";
import { scrapeMercadoLibre } from "./mercadolibre";
import { scrapeTiendanube } from "./tiendanube";
import { getStore } from "./stores";
import { scrapeWooApi } from "./woocommerce-api";
import { scrapeWooHtml } from "./woocommerce-html";

export interface ScrapeDeps {
  fetchFn?: FetchFn;
  delayFn?: (ms: number) => Promise<void>;
}

export async function scrapeStore(id: StoreId, deps: ScrapeDeps = {}): Promise<RawProduct[]> {
  const config = getStore(id);
  let rows: RawProduct[];
  switch (config.platform) {
    case "woocommerce-api":
      rows = await scrapeWooApi(config, deps);
      break;
    case "woocommerce-html":
      rows = await scrapeWooHtml(config, deps);
      break;
    case "tiendanube":
      rows = await scrapeTiendanube(config, deps);
      break;
    case "mercadolibre":
      rows = await scrapeMercadoLibre(config, deps);
      break;
  }
  return rows.map(enrich);
}
