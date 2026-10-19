import type { CategoryFilter, SortKey } from "@/lib/filter-catalog";

export const SORT_KEYS: SortKey[] = [
  "price_per_kg-desc",
  "price_per_kg-asc",
  "grams-desc",
  "grams-asc",
  "price-desc",
  "price-asc",
  "name-asc",
  "roaster-asc",
];

export const CATEGORY_KEYS: CategoryFilter[] = ["all", "single-origin", "blend", "equipment"];

export const SELECT_CLASS =
  "w-full rounded-full border border-line bg-surface px-4 py-2 text-sm text-foreground transition-colors duration-200 hover:border-accent sm:w-auto";

export function chipClass(active: boolean): string {
  return [
    "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200",
    active
      ? "border-accent bg-accent text-on-accent shadow-sm"
      : "border-line bg-surface text-foreground hover:-translate-y-0.5 hover:border-accent hover:text-accent",
  ].join(" ");
}
