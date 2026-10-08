import { parseArsPrice, parseGrams } from "@/lib/normalize";
import type { RawProduct } from "@/lib/types";
import { fetchText, type FetchFn } from "./http";
import { dedupeByExternalId } from "./ldjson";
import type { WooApiStore } from "./stores";

interface WooPrices {
  price?: string;
}

interface WooAttributeTerm {
  name?: string;
  slug?: string;
  default?: boolean;
}

interface WooAttribute {
  name?: string;
  taxonomy?: string;
  terms?: WooAttributeTerm[];
}

interface WooVariationRef {
  id?: number;
  attributes?: { name?: string; value?: string }[];
}

interface WooProduct {
  id?: number;
  name?: string;
  slug?: string;
  permalink?: string;
  sku?: string;
  is_in_stock?: boolean;
  prices?: WooPrices;
  attributes?: WooAttribute[];
  variations?: WooVariationRef[];
  images?: { src?: string }[];
  categories?: { name?: string }[];
  short_description?: string;
}

export interface WooApiScrapeDeps {
  fetchFn?: FetchFn;
}

function isExcluded(product: WooProduct, excludeCategories?: readonly string[]): boolean {
  if (!excludeCategories || excludeCategories.length === 0) return false;
  return (product.categories ?? []).some((category) =>
    category.name ? excludeCategories.includes(category.name) : false,
  );
}

function baseExternalId(product: WooProduct): string {
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

async function fetchVariation(
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

async function expandWeights(
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
    const price = variation.prices ? parseArsPrice(variation.prices.price ?? "") : null;
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

function weightAttribute(product: WooProduct): WooAttribute | undefined {
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

function parentRow(config: WooApiStore, product: WooProduct, peso?: WooAttribute): RawProduct | null {
  const price = product.prices ? parseArsPrice(product.prices.price ?? "") : null;
  if (price == null || price <= 0) return null;

  const grams = gramsFromAttribute(peso);

  return buildRow(config, product, {
    external_id: baseExternalId(product),
    price,
    grams,
    url: product.permalink ?? "",
    image_url: product.images?.[0]?.src ?? null,
    in_stock: true,
  });
}

export async function scrapeWooApi(
  config: WooApiStore,
  deps: WooApiScrapeDeps = {},
): Promise<RawProduct[]> {
  const { fetchFn } = deps;
  const text = await fetchText(config.source, { fetchFn });
  const parsed: unknown = JSON.parse(text);
  const products = Array.isArray(parsed) ? (parsed as WooProduct[]) : [];
  const detailBase = config.source.split("?")[0];

  const rows: RawProduct[] = [];
  for (const product of products) {
    if (!product || product.is_in_stock === false) continue;
    if (isExcluded(product, config.excludeCategories)) continue;

    const peso = weightAttribute(product);
    const expanded = peso
      ? await expandWeights(config, product, peso, detailBase, fetchFn)
      : null;
    const row = expanded ? null : parentRow(config, product, peso);
    if (expanded) rows.push(...expanded);
    else if (row) rows.push(row);
  }
  return dedupeByExternalId(rows);
}
