import { parseArsPrice, parseGrams } from "@/lib/normalize";
import type { RawProduct } from "@/lib/types";
import { fetchText, type FetchFn } from "./http";
import type { WooApiStore } from "./stores";
import type {
  WooAttribute,
  WooAttributeTerm,
  WooPrices,
  WooProduct,
} from "./woocommerce-api.types";

// Store API prices are integers in `currency_minor_unit` units (e.g. "7310000"
// with unit 2 is $73.100); shops configured with minor unit 0 already send pesos.
export function wooPrice(prices?: WooPrices): number | null {
  if (!prices) return null;
  const parsed = parseArsPrice(prices.price ?? "");
  if (parsed == null) return null;
  const minor = prices.currency_minor_unit;
  return typeof minor === "number" && minor > 0 ? Math.round(parsed / 10 ** minor) : parsed;
}

export function isExcluded(product: WooProduct, excludeCategories?: readonly string[]): boolean {
  if (!excludeCategories || excludeCategories.length === 0) return false;
  return (product.categories ?? []).some((category) =>
    category.name ? excludeCategories.includes(category.name) : false,
  );
}

export function baseExternalId(product: WooProduct): string {
  const sku = product.sku?.trim();
  if (sku) return sku;
  if (product.slug) return product.slug;
  return String(product.id ?? "");
}

const FREE_SHIPPING_THRESHOLD = /MAYORES\s*A\s*\$?\s*([\d.]+)/i;

function shippingNoteFromDescription(text?: string): string | null {
  if (!text) return null;
  const threshold = FREE_SHIPPING_THRESHOLD.exec(text.replace(/<[^>]+>/g, ""))?.[1];
  return threshold ? `Envío gratis desde $${threshold}` : null;
}

function buildRow(
  config: WooApiStore,
  product: WooProduct,
  fields: {
    external_id: string;
    price: number;
    grams: number | null;
    url: string;
    image_url: string | null;
    in_stock: boolean;
  },
): RawProduct {
  return {
    store: config.id,
    external_id: fields.external_id,
    name: product.name ?? "",
    url: fields.url,
    roaster: config.roaster,
    price: fields.price,
    image_url: fields.image_url,
    grams: fields.grams,
    in_stock: fields.in_stock,
    free_shipping: null,
    shipping_note: shippingNoteFromDescription(product.short_description),
    installments: null,
  };
}

export async function fetchVariation(
  detailBase: string,
  id: number,
  fetchFn?: FetchFn,
): Promise<WooProduct | null> {
  try {
    const text = await fetchText(`${detailBase}/${id}`, { fetchFn });
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed as WooProduct;
    return null;
  } catch {
    return null;
  }
}

export async function expandWeights(
  config: WooApiStore,
  product: WooProduct,
  peso: WooAttribute,
  detailBase: string,
  fetchFn?: FetchFn,
): Promise<RawProduct[] | null> {
  const terms = peso.terms ?? [];
  const refs = product.variations ?? [];
  if (terms.length === 0 || refs.length === 0) return null;

  const rows: RawProduct[] = [];
  for (const term of terms) {
    const ref = refs.find((candidate) =>
      (candidate.attributes ?? []).some(
        (attribute) =>
          /peso/i.test(attribute.name ?? "") && attribute.value === term.slug,
      ),
    );
    if (ref?.id == null) continue;
    const variation = await fetchVariation(detailBase, ref.id, fetchFn);
    if (!variation) continue;
    const price = wooPrice(variation.prices);
    if (price == null || price <= 0) continue;
    const externalId = `${baseExternalId(product)}-${parseGrams(term.name ?? "") ?? ref.id}`;
    rows.push(
      buildRow(config, product, {
        external_id: externalId,
        price,
        grams: parseGrams(term.name ?? ""),
        url: variation.permalink ?? product.permalink ?? "",
        image_url: variation.images?.[0]?.src ?? product.images?.[0]?.src ?? null,
        in_stock: variation.is_in_stock ?? true,
      }),
    );
  }
  return rows.length > 0 ? rows : null;
}

export function weightAttribute(product: WooProduct): WooAttribute | undefined {
  return (product.attributes ?? []).find(
    (attribute) =>
      /peso/i.test(attribute.name ?? "") ||
      /peso/i.test(attribute.taxonomy ?? "") ||
      (attribute.terms ?? []).some((term) => parseGrams(term.name ?? "") != null),
  );
}

function gramsFromAttribute(attribute?: WooAttribute): number | null {
  const terms = attribute?.terms ?? [];
  const parseable = (term: WooAttributeTerm) => parseGrams(term.name ?? "") != null;
  const preferred = terms.find((term) => term.default && parseable(term)) ?? terms.find(parseable);
  return preferred ? parseGrams(preferred.name ?? "") : null;
}

// WooCommerce stores the weight in the shop's weight unit (kg by default), not
// JSON-LD's unitCode, so values like "0.25" mean 250 g.
function gramsFromWooWeight(weight: unknown): number | null {
  const value = typeof weight === "number" ? weight : Number.parseFloat(String(weight ?? ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 1000);
}

export function parentRow(config: WooApiStore, product: WooProduct, peso?: WooAttribute): RawProduct | null {
  const price = wooPrice(product.prices);
  if (price == null || price <= 0) return null;

  // Some shops (e.g. Cofi Jaus) encode grammage in the product name instead of a
  // weight attribute; the API weight is the last resort.
  const grams =
    gramsFromAttribute(peso) ??
    parseGrams(product.name ?? "") ??
    gramsFromWooWeight(product.weight);

  return buildRow(config, product, {
    external_id: baseExternalId(product),
    price,
    grams,
    url: product.permalink ?? "",
    image_url: product.images?.[0]?.src ?? null,
    in_stock: true,
  });
}
