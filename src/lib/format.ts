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

export function sortGramValues(values: Iterable<number>): number[] {
  return [...new Set(values)].sort((a, b) => b - a);
}

export function formatArs(value: number): string {
  return ARS_FORMATTER.format(value).replace(/\s/g, "");
}

export function formatPerKg(pricePerKg: number | null): string | null {
  if (pricePerKg === null) return null;
  return `${formatArs(pricePerKg)}/kg`;
}

export function formatGrams(grams: number): string {
  if (grams < 1000) return `${grams} g`;
  if (grams % 1000 === 0) return `${grams / 1000} kg`;
  return `${(grams / 1000).toLocaleString("es-AR")} kg`;
}

export function formatGramsLine(grams: number | null, pricePerKg: number | null): string | null {
  if (grams === null) return null;
  const weight = formatGrams(grams);
  const perKg = formatPerKg(pricePerKg);
  return perKg === null ? weight : `${weight} · ${perKg}`;
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
  const present: number[] = [];
  for (const product of products) {
    if (product.grams !== null) present.push(product.grams);
  }
  return sortGramValues(present);
}
