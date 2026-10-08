import type { Dictionary } from "./types";

export const es: Dictionary = {
  meta: {
    title: "Quiero Café — Precios de café de especialidad en Argentina",
    description:
      "Compará precios por kilo de café de especialidad de tostadores argentinos: marcas, orígenes y moliendas en un solo lugar, con datos actualizados a diario desde las tiendas de cada tostador.",
    keywords: [
      "café de especialidad",
      "café por kilo",
      "precio café por kilo",
      "tostadores argentinos",
      "comparador de café",
      "café Colombia",
      "café Etiopía",
      "café Brasil",
      "café Bolivia",
      "comprar café especial Argentina",
    ],
    jsonLd: {
      name: "Quiero Café",
      description:
        "Comparador de precios de café de especialidad de tostadores argentinos, con precio por kilo comparable.",
      inLanguage: "es-AR",
    },
  },
  ticker: {
    roasters: (count) => `${count} tostadores`,
    dailyPrices: "precios actualizados todos los días",
    comparablePerKg: "precio por kilo comparable",
    specialtyBlendsGear: "café de especialidad, blends y equipo",
  },
  hero: {
    eyebrow: "Comparador de precios",
    description: (count) =>
      `Precios de café de especialidad de ${count} tostadores argentinos, directo desde sus tiendas.`,
  },
  emptyCatalog: {
    title: "Todavía no hay datos",
    body: "Esperá al próximo scrapeo: los precios se actualizan solos todos los días.",
  },
  footer: {
    description:
      "Los precios se actualizan solos todos los días, directo desde las tiendas de cada tostador, así siempre comparás el último valor por kilo.",
  },
  catalog: {
    sectionAria: "Catálogo de cafés",
    searchPlaceholder: "Buscar café, origen o tostador…",
    searchAria: "Buscar productos",
    filters: "Filtros",
    productOne: "producto",
    productMany: "productos",
    sortLabel: "Ordenar por",
    sort: {
      "price_per_kg-desc": "Mayor precio por kg",
      "price_per_kg-asc": "Menor precio por kg",
      "grams-desc": "Mayor gramaje",
      "grams-asc": "Menor gramaje",
      "price-desc": "Mayor precio",
      "price-asc": "Menor precio",
      "name-asc": "Nombre (A-Z)",
      "roaster-asc": "Tostador (A-Z)",
    },
    categoryLabel: "Categoría",
    category: {
      all: "Todos los cafés",
      "single-origin": "Single origin",
      blend: "Blend",
      equipment: "Herramientas y accesorios",
    },
    originLabel: "País de origen",
    allCountries: "Todos los países",
    noWeight: "sin gramaje",
    emptyResults: "No encontramos cafés con esos filtros",
    clearFilters: "Limpiar filtros",
    loadMore: (count) => `Cargar más (${count})`,
  },
  productCard: {
    category: {
      "single-origin": "Single origin",
      blend: "Blend",
      equipment: "Equipo",
    },
    grind: {
      "whole-bean": "En grano",
      ground: "Molido",
    },
    freeShipping: "Envío gratis",
    viewOnStore: "Ver en la tienda",
  },
  updatedBadge: {
    justUpdated: "Recién actualizado",
    updated: (relative) => `Actualizado ${relative}`,
  },
};
