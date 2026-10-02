import type { StoreId } from "@/lib/types";

export interface StoreBase {
  id: StoreId;
  roaster: string;
  baseUrl: string;
  refreshMinutes: number;
  excludeCategories?: readonly string[];
}

export interface WooApiStore extends StoreBase {
  platform: "woocommerce-api";
  source: string;
}

export interface WooHtmlStore extends StoreBase {
  platform: "woocommerce-html";
  sitemapUrl: string;
  requestDelayMs: number;
}

export type TiendanubePagination =
  | { kind: "query"; param: string }
  | { kind: "path" };

export interface TiendanubeStore extends StoreBase {
  platform: "tiendanube";
  source: string;
  pagination: TiendanubePagination;
}

export type StoreConfig = WooApiStore | WooHtmlStore | TiendanubeStore;

const CAFE_DELIRANTE_EXCLUDES = [
  "Accesorios",
  "Maquinas de Café",
  "Filtros de Café",
  "Molinillos de Café",
  "Suscripciones",
] as const;

export const STORES: readonly StoreConfig[] = [
  {
    id: "cafedelirante",
    platform: "woocommerce-api",
    roaster: "Café Delirante",
    baseUrl: "https://cafedelirante.com.ar",
    source: "https://cafedelirante.com.ar/wp-json/wc/store/v1/products?per_page=100",
    refreshMinutes: 60,
    excludeCategories: CAFE_DELIRANTE_EXCLUDES,
  },
  {
    id: "flatnwhite",
    platform: "woocommerce-html",
    roaster: "Flat & White",
    baseUrl: "https://flatnwhite.com",
    sitemapUrl: "https://flatnwhite.com/product-sitemap.xml",
    requestDelayMs: 1200,
    refreshMinutes: 360,
  },
  {
    id: "indigoroasters",
    platform: "tiendanube",
    roaster: "Indigo Coffee Roasters",
    baseUrl: "https://indigoroasters.com",
    source: "https://indigoroasters.com/productos/",
    pagination: { kind: "query", param: "page" },
    refreshMinutes: 60,
  },
  {
    id: "momotostadores",
    platform: "tiendanube",
    roaster: "Momo Tostadores",
    baseUrl: "https://www.momotostadores.com",
    source: "https://www.momotostadores.com/productos/",
    pagination: { kind: "path" },
    refreshMinutes: 60,
  },
  {
    id: "bunatostadores",
    platform: "tiendanube",
    roaster: "Buna Tostadores",
    baseUrl: "https://bunatostadores.com.ar",
    source: "https://bunatostadores.com.ar/productos/",
    pagination: { kind: "query", param: "page" },
    refreshMinutes: 60,
  },
  {
    id: "fuegotostadores",
    platform: "tiendanube",
    roaster: "Fuego Tostadores",
    baseUrl: "https://fuegotostadores.com",
    source: "https://fuegotostadores.com/productos/",
    pagination: { kind: "query", param: "page" },
    refreshMinutes: 60,
  },
];

export function getStore(id: StoreId): StoreConfig {
  const store = STORES.find((entry) => entry.id === id);
  if (!store) throw new Error(`Unknown store: ${id}`);
  return store;
}
