import { parseArsPrice, parseGrams } from "@/lib/normalize";
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
  productUrl,
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
function listingPrices(html: string, baseUrl: string): Map<string, number> {
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

function toRow(
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

interface TiendanubeVariant {
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

function decodeVariantsAttr(raw: string): TiendanubeVariant[] {
  try {
    const parsed = JSON.parse(decodeEntities(raw));
    return Array.isArray(parsed) ? (parsed as TiendanubeVariant[]) : [];
  } catch {
    return [];
  }
}

const MIN_INSTALLMENTS = 2;

function interestFreeCount(raw: unknown): number | null {
  if (typeof raw !== "string" || !raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  let best: number | null = null;
  for (const provider of Object.values(parsed as Record<string, unknown>)) {
    if (!provider || typeof provider !== "object" || Array.isArray(provider)) continue;
    for (const [key, plan] of Object.entries(provider as Record<string, unknown>)) {
      const count = Number.parseInt(key, 10);
      if (!Number.isInteger(count) || count < MIN_INSTALLMENTS) continue;
      if (!plan || typeof plan !== "object") continue;
      const record = plan as Record<string, unknown>;
      const interest = record.interest;
      const zeroInterest =
        (typeof interest === "number" && interest === 0) ||
        (typeof interest === "string" && interest.trim() !== "" && Number(interest) === 0);
      if (!zeroInterest && record.without_interests !== true) continue;
      if (best == null || count > best) best = count;
    }
  }
  return best;
}

function installmentsFor(variants: TiendanubeVariant[] | undefined): string | null {
  if (!variants || variants.length === 0) return null;
  let best: number | null = null;
  for (const variant of variants) {
    const count = interestFreeCount(variant.installments_data);
    if (count != null && (best == null || count > best)) best = count;
  }
  return best != null ? `${best} cuotas sin interés` : null;
}

function decodeJsString(raw: string): string {
  return raw
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\(.)/g, "$1");
}

function urlKey(url: string): string {
  return url.replace(/\/+$/, "");
}

const LOADER_PAIR_WINDOW = 1024;

// Tiendanube's loader script is a JS literal (unquoted keys, JS escapes), not JSON.
function loaderFreeShipping(html: string): Map<string, boolean> {
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

function firstAnchorAfter(html: string, from: number): string | null {
  const slice = html.slice(from, from + ANCHOR_SEARCH_WINDOW);
  const match = /<a\b[^>]*?href=(["'])([^"']+)\1/i.exec(slice);
  return match ? decodeEntities(match[2]) : null;
}

function canonicalUrl(html: string, baseUrl: string): string | null {
  const link = /<link\b[^>]*?rel=(["'])canonical\1[^>]*?>/i.exec(html);
  const href = link ? /href=(["'])([^"']+)\1/i.exec(link[0]) : null;
  if (href) return absoluteUrl(decodeEntities(href[2]), baseUrl);
  const og = /property=(["'])og:url\1[^>]*?content=(["'])([^"']+)\2/i.exec(html);
  return og ? absoluteUrl(decodeEntities(og[3]), baseUrl) : null;
}

function detailVariants(html: string): TiendanubeVariant[] | null {
  const idIndex = html.search(/\bid=(["'])single-product\1/i);
  if (idIndex < 0) return null;
  const match = /data-variants=(["'])([\s\S]*?)\1/.exec(html.slice(idIndex, idIndex + 4096));
  if (!match) return null;
  if (html.slice(idIndex, idIndex + match.index).includes(">")) return null;
  const variants = decodeVariantsAttr(match[2]);
  return variants.length > 0 ? variants : null;
}

function variantsByProductUrl(html: string, baseUrl: string): Map<string, TiendanubeVariant[]> {
  const map = new Map<string, TiendanubeVariant[]>();
  const detail = detailVariants(html);
  if (detail) {
    const canonical = canonicalUrl(html, baseUrl);
    if (canonical) map.set(canonical, detail);
  }
  for (const match of html.matchAll(/data-variants=(["'])([\s\S]*?)\1/g)) {
    const variants = decodeVariantsAttr(match[2]);
    if (variants.length === 0) continue;
    const anchor = firstAnchorAfter(html, match.index + match[0].length);
    const url = anchor ? absoluteUrl(anchor, baseUrl) : null;
    if (url && !map.has(url)) map.set(url, variants);
  }
  return map;
}

function optionGrams(variant: TiendanubeVariant, option: "option0" | "option1" | "option2"): number | null {
  const value = variant[option];
  return typeof value === "string" && value ? parseGrams(value) : null;
}

function expandVariantRows(row: RawProduct, variants: TiendanubeVariant[]): RawProduct[] | null {
  if (variants.length < 2) return null;

  const options = ["option0", "option1", "option2"] as const;
  let axis: (typeof options)[number] | null = null;
  for (const option of options) {
    const grams = new Set<number>();
    for (const variant of variants) {
      const parsed = optionGrams(variant, option);
      if (parsed != null) grams.add(parsed);
    }
    if (grams.size >= 2) {
      axis = option;
      break;
    }
  }
  if (!axis) return null;

  const byGrams = new Map<number, RawProduct>();
  for (const variant of variants) {
    const grams = optionGrams(variant, axis);
    if (grams == null || byGrams.has(grams)) continue;
    const price = parseArsPrice(
      variant.has_promotional_price && variant.promotional_price_number != null
        ? variant.promotional_price_number
        : variant.price_number ?? "",
    );
    if (price == null || price <= 0) continue;
    const sku = typeof variant.sku === "string" ? variant.sku.trim() : "";
    byGrams.set(grams, {
      ...row,
      external_id: sku || `${row.external_id}-${grams}`,
      price,
      grams,
      in_stock: typeof variant.available === "boolean" ? variant.available : row.in_stock,
    });
  }
  if (byGrams.size < 2) return null;
  return [...byGrams.values()];
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
