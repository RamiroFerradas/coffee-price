import { parseArsPrice, parseGrams } from "@/lib/normalize";
import type { RawProduct } from "@/lib/types";
import {
  absoluteUrl,
  decodeEntities,
  firstImageUrl,
  gramsFromWeight,
  inStockFromAvailability,
  slugFromUrl,
  type LdOffer,
  type LdProduct,
} from "./ldjson";
import {
  emptySpecs,
  notesFromText,
  processFromName,
  roastFromText,
  structuredSpecs,
  type CoffeeSpecs,
} from "./specs";
import type { TiendanubeStore } from "./stores";

export const MAX_PAGES = 10;

export function pageUrl(config: TiendanubeStore, page: number): string {
  if (page === 1) return config.source;
  if (config.pagination.kind === "query") {
    const url = new URL(config.source);
    url.searchParams.set(config.pagination.param, String(page));
    return url.toString();
  }
  const base = new URL(config.source);
  return `${base.origin}/page/${page}${base.pathname}`;
}

// Tiendanube publishes placeholder shipping weights (0.001 kg) that round to 1 g;
// no real product in these catalogs weighs less than 10 g.
const PLACEHOLDER_MIN_GRAMS = 10;

function gramsFor(config: TiendanubeStore, product: LdProduct, sku: string): number | null {
  // The product name is the authoritative grammage for every Tiendanube store: the LD
  // weight is the shipping/admin weight, not the bag size (e.g. a 125 g bag ships at 0.13 kg).
  let grams: number | null = parseGrams(product.name ?? "");
  if (grams == null && config.gramsFromSku) {
    // When the name carries no grammage, the SKU suffix is the real grammage for stores
    // whose LD weight is Tiendanube's default shipping weight.
    const match = config.gramsFromSku.exec(sku);
    const fromSku = match ? Number(match[1]) : Number.NaN;
    grams = Number.isFinite(fromSku) && fromSku > 0 ? fromSku : null;
  }
  if (grams == null) {
    grams = gramsFromWeight(product.weight);
  }
  return grams != null && grams < PLACEHOLDER_MIN_GRAMS ? null : grams;
}

// Tiendanube's JSON-LD carries the pre-discount price while a promotion is
// active; the listing card's js-price-display span holds the real current price.
export function listingPrices(html: string, baseUrl: string): Map<string, number> {
  const anchors: { pos: number; href: string }[] = [];
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)) {
    anchors.push({ pos: match.index ?? 0, href: match[1] });
  }
  const prices = new Map<string, number>();
  let anchorIdx = 0;
  for (const match of html.matchAll(
    /<span\b[^>]*class="[^"]*js-price-display[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
  )) {
    const pos = match.index ?? 0;
    let url: string | null = null;
    while (anchorIdx < anchors.length && anchors[anchorIdx].pos < pos) {
      url = absoluteUrl(anchors[anchorIdx].href, baseUrl);
      anchorIdx += 1;
    }
    if (!url || prices.has(url)) continue;
    const openTagEnd = match[0].indexOf(">");
    const openTag = match[0].slice(0, openTagEnd + 1);
    const text = match[0].slice(openTagEnd + 1, match[0].length - "</span>".length);
    const fromText = parseArsPrice(text);
    const cents = /data-product-price="(\d+)"/.exec(openTag);
    const value =
      fromText != null && fromText > 0
        ? fromText
        : cents
          ? Number(cents[1]) / 100
          : 0;
    if (value > 0) prices.set(url, value);
  }
  return prices;
}

function specsFor(config: TiendanubeStore, product: LdProduct, name: string): CoffeeSpecs {
  const description = typeof product.description === "string" ? product.description : "";
  const specs =
    config.id === "momotostadores"
      ? structuredSpecs(description)
      : {
          ...emptySpecs(),
          tasting_notes: notesFromText(description),
          roast_level: roastFromText(description),
        };
  return { ...specs, process: processFromName(name) ?? specs.process };
}

export function toRow(
  config: TiendanubeStore,
  product: LdProduct,
  listing: Map<string, number>,
  url: string,
): RawProduct | null {
  const name = decodeEntities(product.name ?? "").trim();
  if (!name) return null;

  const offers = product.offers;
  const offer: LdOffer | undefined = Array.isArray(offers) ? offers[0] : offers;
  const rawPrice = offer?.price ?? offer?.priceSpecification?.price;
  const ldPrice = rawPrice != null ? parseArsPrice(rawPrice) : null;
  if (ldPrice == null || ldPrice <= 0) return null;
  const rendered = listing.get(url);
  const price = rendered != null && rendered > 0 ? rendered : ldPrice;

  const sku = typeof product.sku === "string" ? product.sku.trim() : "";
  return {
    store: config.id,
    external_id: sku || slugFromUrl(url),
    name,
    url,
    roaster: config.roaster,
    price,
    image_url: firstImageUrl(product.image, config.baseUrl),
    grams: gramsFor(config, product, sku),
    in_stock: inStockFromAvailability(offer?.availability),
    ...specsFor(config, product, name),
  };
}

export function decodeJsString(raw: string): string {
  return raw
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\(.)/g, "$1");
}

export function urlKey(url: string): string {
  return url.replace(/\/+$/, "");
}

const LOADER_PAIR_WINDOW = 1024;

// Tiendanube's loader script is a JS literal (unquoted keys, JS escapes), not JSON.
export function loaderFreeShipping(html: string): Map<string, boolean> {
  const flags = new Map<string, boolean>();
  const token = /canonical_url:\s*"([^"]+)"|free_shipping:\s*(true|false)/g;
  let pending: { key: string; at: number } | null = null;
  for (const match of html.matchAll(token)) {
    if (match[1] !== undefined) {
      pending = { key: urlKey(decodeJsString(match[1])), at: match.index ?? 0 };
      continue;
    }
    if (!pending) continue;
    if ((match.index ?? 0) - pending.at > LOADER_PAIR_WINDOW) {
      pending = null;
      continue;
    }
    flags.set(pending.key, match[2] === "true");
    pending = null;
  }
  return flags;
}

const ANCHOR_SEARCH_WINDOW = 16384;

export function firstAnchorAfter(html: string, from: number): string | null {
  const slice = html.slice(from, from + ANCHOR_SEARCH_WINDOW);
  const match = /<a\b[^>]*?href=(["'])([^"']+)\1/i.exec(slice);
  return match ? decodeEntities(match[2]) : null;
}

export function canonicalUrl(html: string, baseUrl: string): string | null {
  const link = /<link\b[^>]*?rel=(["'])canonical\1[^>]*?>/i.exec(html);
  const href = link ? /href=(["'])([^"']+)\1/i.exec(link[0]) : null;
  if (href) return absoluteUrl(decodeEntities(href[2]), baseUrl);
  const og = /property=(["'])og:url\1[^>]*?content=(["'])([^"']+)\2/i.exec(html);
  return og ? absoluteUrl(decodeEntities(og[3]), baseUrl) : null;
}
