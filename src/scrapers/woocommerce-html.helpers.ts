import { parseArsPrice } from "@/lib/normalize";
import type { RawProduct } from "@/lib/types";
import {
  absoluteUrl,
  collectProducts,
  decodeEntities,
  extractLdJsonBlocks,
  firstImageUrl,
  gramsFromWeight,
  inStockFromAvailability,
  productUrl,
  slugFromUrl,
  type LdOffer,
  type LdProduct,
} from "./ldjson";
import type { WooHtmlStore } from "./stores";
import { specsFromWooDetail } from "./specs";
import type { WooVariation } from "./woocommerce-html.types";

export function parseSitemap(xml: string): string[] {
  const urls: string[] = [];
  for (const block of xml.matchAll(/<url>[\s\S]*?<\/url>/g)) {
    const loc = block[0].match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    if (loc) urls.push(loc);
  }
  return urls;
}

function isSameOrigin(url: string, baseUrl: string): boolean {
  try {
    return new URL(url).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

export function urlsFromArchive(html: string, baseUrl: string): string[] {
  const discovered = new Set<string>();
  for (const product of collectProducts(extractLdJsonBlocks(html))) {
    const url = absoluteUrl(productUrl(product), baseUrl);
    if (url && isSameOrigin(url, baseUrl)) discovered.add(url);
  }
  return [...discovered];
}

function cleanName(name: string): string {
  return decodeEntities(name)
    .replace(/\s*[|\-]\s*flat\s*&?\s*white.*$/i, "")
    .trim();
}

const WAYRA_SHIPPING_BLOCK = "wayra-product-shipping-free";
const FREE_SHIPPING_THRESHOLD = /supera los\s*\$?\s*([\d.]+)/i;

function shippingNoteFromDetail(html: string): string | null {
  const start = html.indexOf(WAYRA_SHIPPING_BLOCK);
  if (start < 0) return null;
  const text = decodeEntities(html.slice(start, start + 300).replace(/<[^>]+>/g, " "));
  const threshold = FREE_SHIPPING_THRESHOLD.exec(text)?.[1];
  return threshold ? `Envío gratis desde $${threshold}` : null;
}

export function toRow(
  config: WooHtmlStore,
  product: LdProduct,
  requestedUrl: string,
  html: string,
): RawProduct | null {
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
  const ldDescription = typeof product.description === "string" ? product.description : null;
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
    free_shipping: null,
    shipping_note: shippingNoteFromDetail(html),
    installments: null,
    ...specsFromWooDetail(html, ldDescription),
  };
}

export function parseVariations(html: string): WooVariation[] {
  const match = /data-product_variations=(["'])([\s\S]*?)\1/.exec(html);
  if (!match) return [];
  try {
    const parsed = JSON.parse(decodeEntities(match[2]));
    return Array.isArray(parsed) ? (parsed as WooVariation[]) : [];
  } catch {
    return [];
  }
}

function variationGrams(variation: WooVariation): number | null {
  const weight =
    typeof variation.weight === "number"
      ? variation.weight
      : Number.parseFloat(String(variation.weight ?? ""));
  if (!Number.isFinite(weight) || weight <= 0) return null;
  return Math.round(weight * 1000);
}

export function expandWeightRows(row: RawProduct, html: string): RawProduct[] | null {
  const variations = parseVariations(html);
  if (variations.length < 2) return null;

  const slug = slugFromUrl(row.url);
  const byGrams = new Map<number, RawProduct>();
  for (const variation of variations) {
    const grams = variationGrams(variation);
    if (grams == null || byGrams.has(grams)) continue;
    const price = parseArsPrice(variation.display_price ?? "");
    if (price == null || price <= 0) continue;
    // First entry per weight wins: the grind axis collapses onto it and the
    // site carries bad outlier prices on later grind entries (aeropress 1 kg
    // at the 250 g price), so min/max would pick the wrong value.
    byGrams.set(grams, {
      ...row,
      external_id: `${slug}-${grams}`,
      price,
      grams,
      in_stock:
        typeof variation.is_in_stock === "boolean" ? variation.is_in_stock : row.in_stock,
    });
  }
  if (byGrams.size < 2) return null;
  return [...byGrams.values()];
}
