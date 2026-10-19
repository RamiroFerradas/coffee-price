import { parseArsPrice, parseGrams } from "@/lib/normalize";
import type { RawProduct } from "@/lib/types";
import { absoluteUrl, decodeEntities } from "./ldjson";
import { canonicalUrl, firstAnchorAfter } from "./tiendanube.helpers";
import type { TiendanubeVariant } from "./tiendanube.types";

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

export function installmentsFor(variants: TiendanubeVariant[] | undefined): string | null {
  if (!variants || variants.length === 0) return null;
  let best: number | null = null;
  for (const variant of variants) {
    const count = interestFreeCount(variant.installments_data);
    if (count != null && (best == null || count > best)) best = count;
  }
  return best != null ? `${best} cuotas sin interés` : null;
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

export function variantsByProductUrl(
  html: string,
  baseUrl: string,
): Map<string, TiendanubeVariant[]> {
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

export function expandVariantRows(row: RawProduct, variants: TiendanubeVariant[]): RawProduct[] | null {
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
