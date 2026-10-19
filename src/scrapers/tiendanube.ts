import type { RawProduct } from "@/lib/types";
import { fetchText } from "./http";
import { absoluteUrl, collectProducts, dedupeByExternalId, extractLdJsonBlocks, productUrl } from "./ldjson";
import type { TiendanubeStore } from "./stores";
import {
  MAX_PAGES,
  loaderFreeShipping,
  listingPrices,
  pageUrl,
  toRow,
  urlKey,
} from "./tiendanube.helpers";
import { expandVariantRows, installmentsFor, variantsByProductUrl } from "./tiendanube.variants";
import type { TiendanubeScrapeDeps } from "./tiendanube.types";

export type { TiendanubeScrapeDeps, TiendanubeVariant } from "./tiendanube.types";

export async function scrapeTiendanube(
  config: TiendanubeStore,
  deps: TiendanubeScrapeDeps = {},
): Promise<RawProduct[]> {
  const { fetchFn } = deps;

  const rows: RawProduct[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    let html: string;
    try {
      html = await fetchText(pageUrl(config, page), { fetchFn });
    } catch {
      break;
    }
    const products = collectProducts(extractLdJsonBlocks(html));
    if (products.length === 0) break;
    const listing = listingPrices(html, config.baseUrl);
    const variants = variantsByProductUrl(html, config.baseUrl);
    const freeShipping = loaderFreeShipping(html);
    for (const product of products) {
      const url = absoluteUrl(productUrl(product), config.baseUrl);
      if (!url) continue;
      const base = toRow(config, product, listing, url);
      if (!base) continue;
      const productVariants = variants.get(url);
      const row: RawProduct = {
        ...base,
        free_shipping: freeShipping.get(urlKey(url)) ?? null,
        shipping_note: null,
        installments: installmentsFor(productVariants),
      };
      rows.push(...(productVariants ? expandVariantRows(row, productVariants) ?? [row] : [row]));
    }
  }
  return dedupeByExternalId(rows);
}
