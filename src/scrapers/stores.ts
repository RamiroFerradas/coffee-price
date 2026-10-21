import type { StoreId } from "@/lib/types";

export interface StoreBase {
  id: StoreId;
  roaster: string;
  baseUrl: string;
  refreshMinutes: number;
  excludeCategories?: readonly string[];
  shippingPolicy?: string;
  installmentsPolicy?: string;
}

export interface WooApiStore extends StoreBase {
  platform: "woocommerce-api";
  source: string;
  // Some products ship a packaging weight in the API that is not the coffee
  // weight; map their external id (sku/slug) to the real grammage.
  gramsOverrides?: Readonly<Record<string, number>>;
}

export type WooHtmlDiscovery =
  | { kind: "sitemap"; sitemapUrl: string }
  | { kind: "archive"; listingUrl: string };

export interface WooHtmlStore extends StoreBase {
  platform: "woocommerce-html";
  discovery: WooHtmlDiscovery;
  requestDelayMs: number;
}

export type TiendanubePagination =
  | { kind: "query"; param: string }
  | { kind: "path" };

export interface TiendanubeStore extends StoreBase {
  platform: "tiendanube";
  source: string;
  pagination: TiendanubePagination;
  gramsFromSku?: RegExp;
}

export interface MercadoLibreStore extends StoreBase {
  platform: "mercadolibre";
  source: string;
  requestDelayMs: number;
  expectCoverage?: boolean;
  fallbackSource?: string;
}

export type StoreConfig = WooApiStore | WooHtmlStore | TiendanubeStore | MercadoLibreStore;

const CAFE_DELIRANTE_EXCLUDES = [
  "Accesorios",
  "Maquinas de Café",
  "Filtros de Café",
  "Molinillos de Café",
  "Suscripciones",
] as const;

const COFIJAUS_EXCLUDES = ["Cursos", "Pasteleria", "Box", "Té"] as const;

// The Drip Bag is a box of 10 x 16.5 g sachets (165 g of coffee), but the API
// reports the box's shipping weight (0.5 kg), which would sort it as the
// cheapest per-kg coffee on the site.
const COFIJAUS_GRAMS_OVERRIDES: Readonly<Record<string, number>> = {
  DRIP7: 165,
};

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
    id: "cofijaus",
    platform: "woocommerce-api",
    roaster: "Cofi Jaus",
    baseUrl: "https://cofijaus.com.ar",
    source: "https://cofijaus.com.ar/wp-json/wc/store/v1/products?per_page=100",
    refreshMinutes: 60,
    excludeCategories: COFIJAUS_EXCLUDES,
    gramsOverrides: COFIJAUS_GRAMS_OVERRIDES,
  },
  {
    id: "flatnwhite",
    platform: "woocommerce-html",
    roaster: "Flat & White",
    baseUrl: "https://flatnwhite.com",
    discovery: {
      kind: "archive",
      listingUrl: "https://flatnwhite.com/cafe-de-especialidad-flatwhite-argentina/",
    },
    shippingPolicy: "Envío gratis desde $90.000",
    requestDelayMs: 10_000,
    refreshMinutes: 360,
  },
  {
    id: "indigoroasters",
    platform: "tiendanube",
    roaster: "Indigo Coffee Roasters",
    baseUrl: "https://indigoroasters.com",
    source: "https://indigoroasters.com/productos/",
    pagination: { kind: "query", param: "page" },
    shippingPolicy: "Envíos gratis en 48 hs",
    refreshMinutes: 60,
  },
  {
    id: "momotostadores",
    platform: "tiendanube",
    roaster: "Momo Tostadores",
    baseUrl: "https://www.momotostadores.com",
    source: "https://www.momotostadores.com/productos/",
    pagination: { kind: "path" },
    shippingPolicy: "Envío gratis desde $77.000",
    installmentsPolicy: "3 cuotas sin interés",
    refreshMinutes: 60,
  },
  {
    id: "bunatostadores",
    platform: "tiendanube",
    roaster: "Buna Tostadores",
    baseUrl: "https://bunatostadores.com.ar",
    source: "https://bunatostadores.com.ar/productos/",
    pagination: { kind: "query", param: "page" },
    installmentsPolicy: "3 cuotas sin interés desde $130.000",
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
  {
    id: "modobarista",
    platform: "tiendanube",
    roaster: "Modo Barista",
    baseUrl: "https://www.modobarista.com",
    source: "https://www.modobarista.com/cafe-especialidad/",
    pagination: { kind: "query", param: "page" },
    gramsFromSku: /(125|250|500)$/,
    shippingPolicy: "Envío gratis desde $150.000",
    refreshMinutes: 60,
  },
  {
    id: "kapselmaker",
    platform: "tiendanube",
    roaster: "Kapselmaker",
    baseUrl: "https://kapselmaker.com",
    source: "https://kapselmaker.com/productos/",
    pagination: { kind: "query", param: "page" },
    installmentsPolicy: "3 cuotas sin interés desde $160.000",
    refreshMinutes: 60,
  },
  {
    id: "johnandjoe",
    platform: "tiendanube",
    roaster: "John & Joe",
    baseUrl: "https://johnandjoe.com.ar",
    source: "https://johnandjoe.com.ar/productos/",
    pagination: { kind: "query", param: "page" },
    shippingPolicy:
      "Envío gratis CABA y GBA desde $105.000 · resto del país desde $135.000",
    refreshMinutes: 60,
  },
  {
    id: "chiquitito",
    platform: "tiendanube",
    roaster: "Chiquitito Café",
    baseUrl: "https://chiquitito.cafe",
    source: "https://chiquitito.cafe/especialidad/",
    pagination: { kind: "query", param: "page" },
    refreshMinutes: 60,
  },
  {
    id: "republicadelcafe",
    platform: "tiendanube",
    roaster: "República del Café",
    baseUrl: "https://www.republicadelcafe.com.ar",
    source: "https://www.republicadelcafe.com.ar/cafe-tostado-natural/",
    pagination: { kind: "query", param: "page" },
    refreshMinutes: 60,
  },
  {
    id: "indiosverdes",
    platform: "mercadolibre",
    roaster: "Café Indios Verdes",
    baseUrl: "https://listado.mercadolibre.com.ar/tienda/cafe-indios-verdes/",
    source: "https://listado.mercadolibre.com.ar/tienda/cafe-indios-verdes/",
    fallbackSource: "https://www.mercadolibre.com.ar/tienda/cafe-indios-verdes",
    refreshMinutes: 360,
    requestDelayMs: 3000,
    expectCoverage: true,
  },
  {
    id: "drupa",
    platform: "mercadolibre",
    roaster: "Drupa",
    baseUrl: "https://www.mercadolibre.com.ar/pagina/tiendafundador",
    source: "https://www.mercadolibre.com.ar/pagina/tiendafundador",
    refreshMinutes: 360,
    requestDelayMs: 3000,
  },
];

export function getStore(id: StoreId): StoreConfig {
  const store = STORES.find((entry) => entry.id === id);
  if (!store) throw new Error(`Unknown store: ${id}`);
  return store;
}
