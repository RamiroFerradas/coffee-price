import { describe, expect, it } from "vitest";
import type { StoreId } from "@/lib/types";
import { STORES, getStore, type TiendanubeStore } from "../stores";

describe("STORES registry", () => {
  it("contains one config per store id", () => {
    expect(STORES.map((s) => s.id).sort()).toEqual([
      "bunatostadores",
      "cafedelirante",
      "chiquitito",
      "cofijaus",
      "drupa",
      "flatnwhite",
      "fuegotostadores",
      "indigoroasters",
      "indiosverdes",
      "johnandjoe",
      "kapselmaker",
      "modobarista",
      "momotostadores",
      "republicadelcafe",
    ] satisfies StoreId[]);
  });

  it("gives every store a roaster, baseUrl and positive refresh interval", () => {
    for (const store of STORES) {
      expect(store.roaster.length).toBeGreaterThan(0);
      expect(store.baseUrl).toMatch(/^https:\/\//);
      expect(store.refreshMinutes).toBeGreaterThan(0);
    }
  });

  it("configures cafedelirante as woocommerce-api against the Store API", () => {
    const store = getStore("cafedelirante");
    expect(store.platform).toBe("woocommerce-api");
    expect(store).toMatchObject({
      roaster: "Café Delirante",
      baseUrl: "https://cafedelirante.com.ar",
      refreshMinutes: 60,
      source: "https://cafedelirante.com.ar/wp-json/wc/store/v1/products?per_page=100",
      excludeCategories: expect.arrayContaining(["Accesorios", "Suscripciones"]),
    });
  });

  it("configures cofijaus as woocommerce-api scoped to the coffee categories", () => {
    const store = getStore("cofijaus");
    expect(store.platform).toBe("woocommerce-api");
    expect(store).toMatchObject({
      roaster: "Cofi Jaus",
      baseUrl: "https://cofijaus.com.ar",
      refreshMinutes: 60,
      source: "https://cofijaus.com.ar/wp-json/wc/store/v1/products?per_page=100",
      excludeCategories: expect.arrayContaining(["Té", "Cursos", "Pasteleria", "Box"]),
    });
  });

  it("configures flatnwhite as woocommerce-html scoped to the coffee archive", () => {
    const store = getStore("flatnwhite");
    expect(store.platform).toBe("woocommerce-html");
    expect(store).toMatchObject({
      roaster: "Flat & White",
      baseUrl: "https://flatnwhite.com",
      refreshMinutes: 360,
      discovery: {
        kind: "archive",
        listingUrl: "https://flatnwhite.com/cafe-de-especialidad-flatwhite-argentina/",
      },
    });
    if (store.platform === "woocommerce-html") {
      // robots.txt: User-agent: * / Crawl-delay: 10
      expect(store.requestDelayMs).toBeGreaterThanOrEqual(10_000);
    }
  });

  it("configures the tiendanube stores with their pagination styles", () => {
    expect(getStore("indigoroasters")).toMatchObject({
      platform: "tiendanube",
      roaster: "Indigo Coffee Roasters",
      refreshMinutes: 60,
      pagination: { kind: "query", param: "page" },
    });
    expect(getStore("bunatostadores")).toMatchObject({
      platform: "tiendanube",
      pagination: { kind: "query", param: "page" },
    });
    expect(getStore("fuegotostadores")).toMatchObject({
      platform: "tiendanube",
      pagination: { kind: "query", param: "page" },
    });
    expect(getStore("momotostadores")).toMatchObject({
      platform: "tiendanube",
      roaster: "Momo Tostadores",
      pagination: { kind: "path" },
    });
    expect(getStore("modobarista")).toMatchObject({
      platform: "tiendanube",
      pagination: { kind: "query", param: "page" },
    });
    expect(getStore("kapselmaker")).toMatchObject({
      platform: "tiendanube",
      pagination: { kind: "query", param: "page" },
    });
    expect(getStore("johnandjoe")).toMatchObject({
      platform: "tiendanube",
      pagination: { kind: "query", param: "page" },
    });
    expect(getStore("chiquitito")).toMatchObject({
      platform: "tiendanube",
      pagination: { kind: "query", param: "page" },
    });
    expect(getStore("republicadelcafe")).toMatchObject({
      platform: "tiendanube",
      roaster: "República del Café",
      source: "https://www.republicadelcafe.com.ar/cafe-tostado-natural/",
      pagination: { kind: "query", param: "page" },
      refreshMinutes: 60,
    });
  });

  it("scopes modobarista to the specialty category and kapselmaker to the full listing", () => {
    expect(getStore("modobarista")).toMatchObject({
      platform: "tiendanube",
      roaster: "Modo Barista",
      baseUrl: "https://www.modobarista.com",
      source: "https://www.modobarista.com/cafe-especialidad/",
      refreshMinutes: 60,
    });
    expect(getStore("kapselmaker")).toMatchObject({
      platform: "tiendanube",
      roaster: "Kapselmaker",
      baseUrl: "https://kapselmaker.com",
      source: "https://kapselmaker.com/productos/",
      refreshMinutes: 60,
    });
    const modo = getStore("modobarista") as TiendanubeStore;
    expect(modo.gramsFromSku).toBeInstanceOf(RegExp);
    expect("gramsFromSku" in getStore("kapselmaker")).toBe(false);
  });

  it("scopes johnandjoe to the full listing and trusts the LD weights", () => {
    expect(getStore("johnandjoe")).toMatchObject({
      platform: "tiendanube",
      roaster: "John & Joe",
      baseUrl: "https://johnandjoe.com.ar",
      source: "https://johnandjoe.com.ar/productos/",
      refreshMinutes: 60,
    });
    expect("gramsFromSku" in getStore("johnandjoe")).toBe(false);
  });

  it("points tiendanube sources at the real listing paths", () => {
    expect(getStore("indigoroasters")).toMatchObject({
      source: "https://indigoroasters.com/productos/",
    });
    expect(getStore("momotostadores")).toMatchObject({
      source: "https://www.momotostadores.com/productos/",
    });
    expect(getStore("bunatostadores")).toMatchObject({
      source: "https://bunatostadores.com.ar/productos/",
    });
    expect(getStore("fuegotostadores")).toMatchObject({
      source: "https://fuegotostadores.com/productos/",
    });
    expect(getStore("johnandjoe")).toMatchObject({
      source: "https://johnandjoe.com.ar/productos/",
    });
    expect(getStore("chiquitito")).toMatchObject({
      // Coffee category listing: skips the gorra and suscripciones listings.
      source: "https://chiquitito.cafe/especialidad/",
    });
  });

  it("configures the mercadolibre storefront stores", () => {
    expect(getStore("indiosverdes")).toMatchObject({
      platform: "mercadolibre",
      roaster: "Café Indios Verdes",
      baseUrl: "https://listado.mercadolibre.com.ar/tienda/cafe-indios-verdes/",
      source: "https://listado.mercadolibre.com.ar/tienda/cafe-indios-verdes/",
      refreshMinutes: 360,
      requestDelayMs: 3000,
    });
    expect(getStore("drupa")).toMatchObject({
      platform: "mercadolibre",
      roaster: "Drupa",
      source: "https://www.mercadolibre.com.ar/pagina/tiendafundador",
      refreshMinutes: 360,
      requestDelayMs: 3000,
    });
  });

  it("throws for unknown store ids", () => {
    expect(() => getStore("nope" as StoreId)).toThrow();
  });

  it("publishes the research-verified per-store shipping policies", () => {
    expect(getStore("indigoroasters")).toMatchObject({
      shippingPolicy: "Envíos gratis en 48 hs",
    });
    expect(getStore("momotostadores")).toMatchObject({
      shippingPolicy: "Envío gratis desde $77.000",
      installmentsPolicy: "3 cuotas sin interés",
    });
    expect(getStore("johnandjoe")).toMatchObject({
      shippingPolicy:
        "Envío gratis CABA y GBA desde $105.000 · resto del país desde $135.000",
    });
    expect(getStore("modobarista")).toMatchObject({
      shippingPolicy: "Envío gratis desde $150.000",
    });
    expect(getStore("flatnwhite")).toMatchObject({
      shippingPolicy: "Envío gratis desde $90.000",
    });
    expect(getStore("bunatostadores")).toMatchObject({
      installmentsPolicy: "3 cuotas sin interés desde $130.000",
    });
    expect(getStore("kapselmaker")).toMatchObject({
      installmentsPolicy: "3 cuotas sin interés desde $160.000",
    });
  });

  it("leaves stores without a published policy unconfigured", () => {
    const bare: StoreId[] = [
      "cafedelirante",
      "fuegotostadores",
      "indiosverdes",
      "drupa",
    ];
    for (const id of bare) {
      const store = getStore(id);
      expect(store.shippingPolicy).toBeUndefined();
      expect(store.installmentsPolicy).toBeUndefined();
    }
    expect(getStore("indigoroasters").installmentsPolicy).toBeUndefined();
    expect(getStore("flatnwhite").installmentsPolicy).toBeUndefined();
    expect(getStore("modobarista").installmentsPolicy).toBeUndefined();
    expect(getStore("johnandjoe").installmentsPolicy).toBeUndefined();
  });
});
