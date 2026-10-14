import type { CategoryFilter, SortKey } from "@/lib/filter-catalog";

export interface Dictionary {
  meta: {
    title: string;
    description: string;
    keywords: string[];
    jsonLd: {
      name: string;
      description: string;
      inLanguage: string;
    };
  };
  ticker: {
    roasters: (count: number) => string;
    dailyPrices: string;
    comparablePerKg: string;
    specialtyBlendsGear: string;
  };
  hero: {
    eyebrow: string;
    description: (count: number) => string;
  };
  emptyCatalog: {
    title: string;
    body: string;
  };
  footer: {
    description: string;
  };
  catalog: {
    sectionAria: string;
    searchPlaceholder: string;
    searchAria: string;
    filters: string;
    productOne: string;
    productMany: string;
    sortLabel: string;
    sort: Record<SortKey, string>;
    categoryLabel: string;
    category: Record<CategoryFilter, string>;
    originLabel: string;
    allCountries: string;
    noWeight: string;
    emptyResults: string;
    clearFilters: string;
    loadMore: (count: number) => string;
  };
  productCard: {
    category: Record<string, string>;
    grind: Record<string, string>;
    freeShipping: string;
    viewOnStore: string;
    perKgRef: string;
    totalLabel: string;
  };
  updatedBadge: {
    justUpdated: string;
    updated: (relative: string) => string;
  };
}
