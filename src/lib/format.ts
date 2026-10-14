import { defaultLocale, type Locale } from "@/i18n/config";
import type { Product } from "@/lib/types";

const ARS_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const RELATIVE_FORMATTERS: Record<Locale, Intl.RelativeTimeFormat> = {
  es: new Intl.RelativeTimeFormat("es-AR", { numeric: "always", style: "short" }),
  en: new Intl.RelativeTimeFormat("en", { numeric: "always", style: "short" }),
};

export const JUST_NOW_LABEL: Readonly<Record<Locale, string>> = {
  es: "recién",
  en: "just now",
};

export function sortGramValues(values: Iterable<number>): number[] {
  return [...new Set(values)].sort((a, b) => b - a);
}

const GRAM_BUCKETS: readonly number[] = [100, 125, 250, 500, 750];

/**
 * Map a stored gram value to its canonical chip bucket.
 * Values >= 1000 keep their exact weight (kg chips stay exact);
 * sub-kilo values snap to the nearest bucket, ties going to the larger one.
 */
export function bucketGrams(grams: null): null;
export function bucketGrams(grams: number): number;
export function bucketGrams(grams: number | null): number | null {
  if (grams === null) return null;
  if (grams >= 1000) return grams;
  let bucket = GRAM_BUCKETS[0];
  let distance = Math.abs(grams - bucket);
  for (const candidate of GRAM_BUCKETS) {
    const candidateDistance = Math.abs(grams - candidate);
    if (candidateDistance <= distance) {
      bucket = candidate;
      distance = candidateDistance;
    }
  }
  return bucket;
}

export function formatArs(value: number): string {
  return ARS_FORMATTER.format(value).replace(/\s/g, "");
}

export function formatGrams(grams: number): string {
  if (grams < 1000) return `${grams} g`;
  if (grams % 1000 === 0) return `${grams / 1000} kg`;
  return `${(grams / 1000).toLocaleString("es-AR")} kg`;
}

export interface PriceBlockLabels {
  perKgRef: string;
  totalLabel: string;
}

export interface PriceBlock {
  perKg: string;
  reference: string;
}

export function formatPriceBlock(
  product: Pick<Product, "grams" | "price" | "price_per_kg">,
  labels: PriceBlockLabels,
): PriceBlock | null {
  if (product.grams === null || product.price_per_kg === null) return null;
  return {
    perKg: formatArs(product.price_per_kg),
    reference: `${labels.perKgRef} · ${labels.totalLabel} ${formatArs(product.price)}`,
  };
}

export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
  locale: Locale = defaultLocale,
): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (Math.abs(diff) < 60_000) return JUST_NOW_LABEL[locale];

  const formatter = RELATIVE_FORMATTERS[locale];
  const sign = diff < 0 ? 1 : -1;
  const abs = Math.abs(diff);
  const minutes = Math.floor(abs / 60_000);
  if (minutes < 60) return formatter.format(sign * minutes, "minute");

  const hours = Math.floor(abs / 3_600_000);
  if (hours < 24) return formatter.format(sign * hours, "hour");

  return formatter.format(sign * Math.floor(abs / 86_400_000), "day");
}

export function availableGrams(products: Product[]): number[] {
  const present: number[] = [];
  for (const product of products) {
    if (product.grams !== null) present.push(product.grams);
  }
  return sortGramValues(present);
}
