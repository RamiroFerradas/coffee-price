import type { RawProduct } from "@/lib/types";
import { fetchText } from "./http";
import { dedupeByExternalId } from "./ldjson";
import type { WooApiStore } from "./stores";
import {
  expandWeights,
  isExcluded,
  parentRow,
  weightAttribute,
} from "./woocommerce-api.helpers";
import type { WooApiScrapeDeps, WooProduct } from "./woocommerce-api.types";

export type { WooApiScrapeDeps, WooProduct } from "./woocommerce-api.types";

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
