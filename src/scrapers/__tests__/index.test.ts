import { describe, expect, it, vi } from "vitest";
import { scrapeStore } from "../index";
import { getStore, type MercadoLibreStore, type TiendanubeStore, type WooApiStore } from "../stores";
import { fixture, makeFetch } from "./fixture";

const noDelay = () => Promise.resolve();

const INDIGO = getStore("indigoroasters") as TiendanubeStore;
const DELIRANTE = getStore("cafedelirante") as WooApiStore;
const MODO = getStore("modobarista") as TiendanubeStore;
const JJ = getStore("johnandjoe") as TiendanubeStore;
const DRUPA = getStore("drupa") as MercadoLibreStore;

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

  it("dispatches modobarista through the tiendanube adapter and enriches the rows", async () => {
    const fetchFn = makeFetch({
      [MODO.source]: fixture("modobarista-listing.html"),
      [`${MODO.source}?page=2`]: "<html></html>",
    });
    const rows = await scrapeStore("modobarista", { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.store === "modobarista")).toBe(true);
    expect(rows.find((row) => row.external_id === "CATOCOCO250")).toMatchObject({
      origin: "Colombia",
      category: "single-origin",
      grams: 250,
      price: 31674,
    });
    expect(rows.find((row) => row.external_id === "CATOBLPR250")?.category).toBe("blend");
  });

  it("dispatches woocommerce-html stores and enriches the rows", async () => {
    const fetchFn = makeFetch({
      ["https://flatnwhite.com/cafe-de-especialidad-flatwhite-argentina/"]: fixture(
        "flatnwhite-archive.html",
      ),
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

  it("dispatches johnandjoe through the tiendanube adapter and enriches the rows", async () => {
    const fetchFn = makeFetch({
      [JJ.source]: fixture("johnandjoe-listing.html"),
      [`${JJ.source}?page=2`]: fixture("johnandjoe-page2.html"),
      [`${JJ.source}?page=3`]: "<html></html>",
    });
    const rows = await scrapeStore("johnandjoe", { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(52);
    expect(rows.every((row) => row.store === "johnandjoe")).toBe(true);
    expect(rows.find((row) => row.external_id === "COL_TOL_250")).toMatchObject({
      name: "Colombia Tolima - Doy pack 250 grs.",
      price: 26800,
      grams: 250,
      origin: "Colombia",
    });
    expect(rows.find((row) => row.external_id === "ETIO_250")?.grams).toBe(250);
    expect(rows.every((row) => row.price > 0)).toBe(true);
  });

  it("dispatches drupa through the mercadolibre adapter and enriches the rows", async () => {
    const fetchFn = makeFetch({ [DRUPA.source]: fixture("ml-drupa-pagina.html") });
    const rows = await scrapeStore("drupa", { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(19);
    expect(rows.every((row) => row.store === "drupa")).toBe(true);
    expect(rows.every((row) => row.roaster === "Drupa")).toBe(true);
    expect(rows.some((row) => row.category === "equipment")).toBe(true);
    expect(rows.every((row) => row.price > 0)).toBe(true);
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
