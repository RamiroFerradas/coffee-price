import type { Product } from "@/lib/types";

const ARS_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat("es-AR", {
  numeric: "always",
  style: "short",
});

const COMMON_GRAMS = [250, 500, 1000];

export function formatArs(value: number): string {
  return ARS_FORMATTER.format(value).replace(/\s/g, "");
}

export function formatPerKg(pricePerKg: number | null): string | null {
  if (pricePerKg === null) return null;
  return `${formatArs(pricePerKg)}/kg`;
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (Math.abs(diff) < 60_000) return "recién";

  const sign = diff < 0 ? 1 : -1;
  const abs = Math.abs(diff);
  const minutes = Math.floor(abs / 60_000);
  if (minutes < 60) return RELATIVE_FORMATTER.format(sign * minutes, "minute");

  const hours = Math.floor(abs / 3_600_000);
  if (hours < 24) return RELATIVE_FORMATTER.format(sign * hours, "hour");

  return RELATIVE_FORMATTER.format(sign * Math.floor(abs / 86_400_000), "day");
}

export function availableGrams(products: Product[]): number[] {
  const present = new Set<number>();
  for (const product of products) {
    if (product.grams !== null) present.add(product.grams);
  }

  const common = COMMON_GRAMS.filter((grams) => present.has(grams));
  const rest = [...present]
    .filter((grams) => !COMMON_GRAMS.includes(grams))
    .sort((a, b) => a - b);
  return [...common, ...rest];
}
