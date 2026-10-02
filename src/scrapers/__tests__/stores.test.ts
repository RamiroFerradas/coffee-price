import { describe, expect, it } from "vitest";
import type { StoreId } from "@/lib/types";
import { STORES, getStore } from "../stores";

describe("STORES registry", () => {
  it("contains one config per store id", () => {
    expect(STORES.map((s) => s.id).sort()).toEqual([
      "bunatostadores",
      "cafedelirante",
      "flatnwhite",
      "fuegotostadores",
      "indigoroasters",
      "momotostadores",
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

  it("configures flatnwhite as woocommerce-html against the product sitemap", () => {
    const store = getStore("flatnwhite");
    expect(store.platform).toBe("woocommerce-html");
    expect(store).toMatchObject({
      roaster: "Flat & White",
      baseUrl: "https://flatnwhite.com",
      refreshMinutes: 360,
      sitemapUrl: "https://flatnwhite.com/product-sitemap.xml",
    });
    if (store.platform === "woocommerce-html") {
      expect(store.requestDelayMs).toBeGreaterThanOrEqual(1000);
    }
  });

  it("configures the four tiendanube stores with their pagination styles", () => {
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
  });

  it("throws for unknown store ids", () => {
    expect(() => getStore("nope" as StoreId)).toThrow();
  });
});
