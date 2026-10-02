import { parseArsPrice } from "@/lib/normalize";
import type { RawProduct } from "@/lib/types";
import { fetchText, type FetchFn } from "./http";
import {
  absoluteUrl,
  collectProducts,
  decodeEntities,
  dedupeByExternalId,
  extractLdJsonBlocks,
  firstImageUrl,
  gramsFromWeight,
  inStockFromAvailability,
  slugFromUrl,
  type LdOffer,
  type LdProduct,
} from "./ldjson";
import type { TiendanubeStore } from "./stores";

export interface TiendanubeScrapeDeps {
  fetchFn?: FetchFn;
  delayFn?: (ms: number) => Promise<void>;
}

const MAX_PAGES = 10;

function pageUrl(config: TiendanubeStore, page: number): string {
  if (page === 1) return config.source;
  if (config.pagination.kind === "query") {
    const url = new URL(config.source);
    url.searchParams.set(config.pagination.param, String(page));
    return url.toString();
  }
  const base = new URL(config.source);
  return `${base.origin}/page/${page}${base.pathname}`;
}

function productUrl(product: LdProduct): string | null {
  if (typeof product.url === "string" && product.url) return product.url;
  const mep = product.mainEntityOfPage;
  if (typeof mep === "string" && mep) return mep;
  if (mep && typeof mep === "object" && mep["@id"]) return mep["@id"];
  return null;
}

function toRow(config: TiendanubeStore, product: LdProduct): RawProduct | null {
  const name = decodeEntities(product.name ?? "").trim();
  if (!name) return null;

  const url = absoluteUrl(productUrl(product), config.baseUrl);
  if (!url) return null;

  const offers = product.offers;
  const offer: LdOffer | undefined = Array.isArray(offers) ? offers[0] : offers;
  const rawPrice = offer?.price ?? offer?.priceSpecification?.price;
  const price = rawPrice != null ? parseArsPrice(rawPrice) : null;
  if (price == null || price <= 0) return null;

  const sku = typeof product.sku === "string" ? product.sku.trim() : "";
  return {
    store: config.id,
    external_id: sku || slugFromUrl(url),
    name,
    url,
    roaster: config.roaster,
    price,
    image_url: firstImageUrl(product.image, config.baseUrl),
    grams: gramsFromWeight(product.weight),
    in_stock: inStockFromAvailability(offer?.availability),
  };
}

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
    for (const product of products) {
      const row = toRow(config, product);
      if (row) rows.push(row);
    }
  }
  return dedupeByExternalId(rows);
}
