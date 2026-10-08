import type { Dictionary } from "./types";

export const en: Dictionary = {
  meta: {
    title: "Quiero Café — Specialty coffee prices in Argentina",
    description:
      "Compare per-kilo prices of specialty coffee from Argentine roasters: brands, origins and grinds in one place, with data updated daily straight from each roaster's store.",
    keywords: [
      "specialty coffee",
      "coffee per kilo",
      "coffee price per kilo",
      "Argentine roasters",
      "coffee comparator",
      "Colombia coffee",
      "Ethiopia coffee",
      "Brazil coffee",
      "Bolivia coffee",
      "buy specialty coffee Argentina",
    ],
    jsonLd: {
      name: "Quiero Café",
      description:
        "Price comparator for specialty coffee from Argentine roasters, with a comparable price per kilo.",
      inLanguage: "en",
    },
  },
  ticker: {
    roasters: (count) => `${count} roasters`,
    dailyPrices: "prices updated daily",
    comparablePerKg: "comparable price per kilo",
    specialtyBlendsGear: "specialty coffee, blends and equipment",
  },
  hero: {
    eyebrow: "Price comparator",
    description: (count) =>
      `Specialty coffee prices from ${count} Argentine roasters, straight from their stores.`,
  },
  emptyCatalog: {
    title: "No data yet",
    body: "Wait for the next scrape: prices update automatically daily.",
  },
  footer: {
    description:
      "Prices refresh automatically every day, straight from each roaster's store, so you always compare the latest price per kilo.",
  },
  catalog: {
    sectionAria: "Coffee catalog",
    searchPlaceholder: "Search coffee, origin or roaster…",
    searchAria: "Search products",
    filters: "Filters",
    productOne: "product",
    productMany: "products",
    sortLabel: "Sort by",
    sort: {
      "price_per_kg-desc": "Highest price per kg",
      "price_per_kg-asc": "Lowest price per kg",
      "grams-desc": "Highest weight",
      "grams-asc": "Lowest weight",
      "price-desc": "Highest price",
      "price-asc": "Lowest price",
      "name-asc": "Name (A-Z)",
      "roaster-asc": "Roaster (A-Z)",
    },
    categoryLabel: "Category",
    category: {
      all: "All coffees",
      "single-origin": "Single origin",
      blend: "Blend",
      equipment: "Equipment & accessories",
    },
    originLabel: "Country of origin",
    allCountries: "All countries",
    noWeight: "no weight",
    emptyResults: "No coffees match those filters",
    clearFilters: "Clear filters",
    loadMore: (count) => `Load more (${count})`,
  },
  productCard: {
    category: {
      "single-origin": "Single origin",
      blend: "Blend",
      equipment: "Equipment",
    },
    grind: {
      "whole-bean": "Whole bean",
      ground: "Ground",
    },
    freeShipping: "Free shipping",
    viewOnStore: "View on store",
  },
  updatedBadge: {
    justUpdated: "Just updated",
    updated: (relative) => `Updated ${relative}`,
  },
};
