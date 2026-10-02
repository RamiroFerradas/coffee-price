import { parseArsPrice } from "@/lib/normalize";
import type { RawProduct } from "@/lib/types";
import { delay, fetchText, type FetchFn } from "./http";
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
import type { WooHtmlStore } from "./stores";

export interface WooHtmlScrapeDeps {
  fetchFn?: FetchFn;
  delayFn?: (ms: number) => Promise<void>;
}

function parseSitemap(xml: string): string[] {
  const urls: string[] = [];
  for (const block of xml.matchAll(/<url>[\s\S]*?<\/url>/g)) {
    const loc = block[0].match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    if (loc) urls.push(loc);
  }
  return urls;
}

function cleanName(name: string): string {
  return decodeEntities(name)
    .replace(/\s*[|\-]\s*flat\s*&?\s*white.*$/i, "")
    .trim();
}

function toRow(config: WooHtmlStore, product: LdProduct, requestedUrl: string): RawProduct | null {
  const offers = product.offers;
  const offer: LdOffer | undefined = Array.isArray(offers) ? offers[0] : offers;
  if (!offer) return null;
  if (offer.priceCurrency && offer.priceCurrency !== "ARS") return null;

  const rawPrice = offer.price ?? offer.lowPrice;
  const price = rawPrice != null ? parseArsPrice(rawPrice) : null;
  if (price == null || price <= 0) return null;

  const name = cleanName(product.name ?? "");
  if (!name) return null;

  const sku = typeof product.sku === "string" ? product.sku.trim() : "";
  return {
    store: config.id,
    external_id: sku || slugFromUrl(requestedUrl),
    name,
    url: absoluteUrl(offer.url ?? requestedUrl, config.baseUrl) ?? requestedUrl,
    roaster: config.roaster,
    price,
    image_url: firstImageUrl(product.image, config.baseUrl),
    grams: gramsFromWeight(product.weight),
    in_stock: inStockFromAvailability(offer.availability),
  };
}

export async function scrapeWooHtml(
  config: WooHtmlStore,
  deps: WooHtmlScrapeDeps = {},
): Promise<RawProduct[]> {
  const { fetchFn, delayFn = delay } = deps;

  const sitemap = await fetchText(config.sitemapUrl, { fetchFn });
  const urls = parseSitemap(sitemap).filter((url) => !url.endsWith("/tienda/"));

  const rows: RawProduct[] = [];
  let fetched = 0;
  for (const url of urls) {
    if (fetched > 0) await delayFn(config.requestDelayMs);
    fetched += 1;
    try {
      const html = await fetchText(url, { fetchFn });
      const [product] = collectProducts(extractLdJsonBlocks(html));
      if (!product) continue;
      const row = toRow(config, product, url);
      if (row) rows.push(row);
    } catch {
      continue;
    }
  }
  return dedupeByExternalId(rows);
}
