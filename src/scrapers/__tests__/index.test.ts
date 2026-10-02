import { describe, expect, it, vi } from "vitest";
import { scrapeStore } from "../index";
import { getStore, type TiendanubeStore, type WooApiStore, type WooHtmlStore } from "../stores";
import { fixture, makeFetch } from "./fixture";

const noDelay = () => Promise.resolve();

const INDIGO = getStore("indigoroasters") as TiendanubeStore;
const FLATNWHITE = getStore("flatnwhite") as WooHtmlStore;
const DELIRANTE = getStore("cafedelirante") as WooApiStore;

describe("scrapeStore", () => {
  it("rejects unknown stores", async () => {
    await expect(scrapeStore("nope" as never)).rejects.toThrow("Unknown store");
  });

  it("dispatches tiendanube stores and enriches the rows", async () => {
    const fetchFn = makeFetch({
      [INDIGO.source]: fixture("indigo-listing.html"),
      [`${INDIGO.source}?page=2`]: "<html></html>",
    });
    const rows = await scrapeStore("indigoroasters", { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      store: "indigoroasters",
      roaster: "Indigo Coffee Roasters",
      origin: "Colombia",
      category: "single-origin",
    });
    expect(rows[0].grams).toBe(1000);
  });

  it("dispatches woocommerce-html stores and enriches the rows", async () => {
    const fetchFn = makeFetch({
      [FLATNWHITE.sitemapUrl]: fixture("flatnwhite-sitemap.xml"),
      ["https://flatnwhite.com/cafe-especialidad-etiopia/"]: fixture(
        "flatnwhite-product-coffee.html",
      ),
    });
    const rows = await scrapeStore("flatnwhite", { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      store: "flatnwhite",
      origin: "Etiopía",
      category: "single-origin",
      variety: null,
      grind: null,
      price: 38000,
      grams: 250,
    });
  });

  it("dispatches woocommerce-api stores and enriches the rows", async () => {
    const products = [
      {
        id: 1,
        name: "Café Colombia Grano",
        slug: "colombia-grano",
        sku: "CD-COLOMBIA",
        permalink: "https://cafedelirante.com.ar/producto/colombia-grano/",
        prices: { price: "15000" },
        attributes: [],
        variations: [],
        images: [{ src: "https://cafedelirante.com.ar/img.jpg" }],
        categories: [],
        is_in_stock: true,
      },
    ];
    const fetchFn = vi.fn(makeFetch({ [DELIRANTE.source]: products }));
    const rows = await scrapeStore("cafedelirante", { fetchFn });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      store: "cafedelirante",
      roaster: "Café Delirante",
      external_id: "CD-COLOMBIA",
      price: 15000,
      origin: "Colombia",
      variety: "Colombia",
      category: "single-origin",
      grind: "whole-bean",
    });
  });
});
