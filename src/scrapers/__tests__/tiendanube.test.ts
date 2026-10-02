import { describe, expect, it, vi } from "vitest";
import { scrapeTiendanube } from "../tiendanube";
import { getStore, type TiendanubeStore } from "../stores";
import { fixture, makeFetch } from "./fixture";

const INDIGO = getStore("indigoroasters") as TiendanubeStore;
const MOMO = getStore("momotostadores") as TiendanubeStore;
const BUNA = getStore("bunatostadores") as TiendanubeStore;

const noDelay = () => Promise.resolve();

describe("scrapeTiendanube pagination", () => {
  it("stops when a page yields zero products and requests pages in order", async () => {
    const fetchFn = vi.fn(
      makeFetch({
        [INDIGO.source]: fixture("indigo-listing.html"),
        [`${INDIGO.source}?page=2`]: "<html><body>no products</body></html>",
      }),
    );
    const rows = await scrapeTiendanube(INDIGO, { fetchFn, delayFn: noDelay });

    expect(fetchFn.mock.calls.map((call) => call[0])).toEqual([
      INDIGO.source,
      `${INDIGO.source}?page=2`,
    ]);
    expect(rows).toHaveLength(2);
  });

  it("builds path-style page urls for momo", async () => {
    const fetchFn = vi.fn(
      makeFetch({
        [MOMO.source]: fixture("momo-listing.html"),
        ["https://www.momotostadores.com/page/2/productos/"]: "<html></html>",
      }),
    );
    await scrapeTiendanube(MOMO, { fetchFn, delayFn: noDelay });

    expect(fetchFn.mock.calls.map((call) => call[0])).toEqual([
      MOMO.source,
      "https://www.momotostadores.com/page/2/productos/",
    ]);
  });

  it("stops after ten pages even when every page returns products", async () => {
    const routes: Record<string, unknown> = { [INDIGO.source]: fixture("indigo-listing.html") };
    for (let page = 2; page <= 10; page++) {
      routes[`${INDIGO.source}?page=${page}`] = fixture("indigo-listing.html");
    }
    const fetchFn = vi.fn(makeFetch(routes));
    await scrapeTiendanube(INDIGO, { fetchFn, delayFn: noDelay });
    expect(fetchFn).toHaveBeenCalledTimes(10);
  });
});

describe("scrapeTiendanube parsing", () => {
  it("parses standalone Product blocks into RawProducts", async () => {
    const fetchFn = makeFetch({
      [INDIGO.source]: fixture("indigo-listing.html"),
      [`${INDIGO.source}?page=2`]: "<html></html>",
    });
    const rows = await scrapeTiendanube(INDIGO, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      store: "indigoroasters",
      roaster: "Indigo Coffee Roasters",
      external_id: "SAKG",
      name: "Colombia Santander - 1 kg",
      url: "https://indigoroasters.com/productos/santander-colombia-1kg/",
      price: 79800,
      grams: 1000,
      in_stock: true,
    });
    expect(rows[0].image_url?.startsWith("https://acdn")).toBe(true);
    expect(rows.every((row) => row.price > 0)).toBe(true);
  });

  it("parses ItemList blocks with nested products", async () => {
    const fetchFn = makeFetch({
      [INDIGO.source]: fixture("tiendanube-itemlist.html"),
      [`${INDIGO.source}?page=2`]: "<html></html>",
    });
    const rows = await scrapeTiendanube(INDIGO, { fetchFn, delayFn: noDelay });

    expect(rows.map((row) => row.external_id)).toEqual(["SAKG", "colibri-250gr-n0cap"]);
  });

  it("falls back to the url slug when sku is missing", async () => {
    const fetchFn = makeFetch({
      [BUNA.source]: fixture("buna-listing.html"),
      [`${BUNA.source}?page=2`]: "<html></html>",
    });
    const rows = await scrapeTiendanube(BUNA, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(2);
    expect(rows[0].external_id).toBe("colibri-250gr-n0cap");
    expect(rows[1].external_id).toBeTruthy();
    expect(new Set(rows.map((row) => row.external_id)).size).toBe(2);
    expect(rows.every((row) => row.grams != null)).toBe(true);
  });

  it("reads availability, missing sku and missing weight from the momo listing", async () => {
    const fetchFn = makeFetch({
      [MOMO.source]: fixture("momo-listing.html"),
      ["https://www.momotostadores.com/page/2/productos/"]: "<html></html>",
    });
    const rows = await scrapeTiendanube(MOMO, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(3);
    const tico = rows.find((row) => row.name === "Tico x 250g");
    expect(tico).toMatchObject({ external_id: "CR-TICO-250", grams: 250, in_stock: true });

    const santaInes = rows.find((row) => row.name.startsWith("Santa Inés"));
    expect(santaInes).toMatchObject({ in_stock: false, grams: 250 });

    const sidra = rows.find((row) => row.name === "Sidra x 250g");
    expect(sidra).toMatchObject({ in_stock: false, grams: null });
    expect(sidra?.external_id).toBe("sidra-x-250g-jo8a6");
  });

  it("dedupes products repeated across pages", async () => {
    const fetchFn = vi.fn(
      makeFetch({
        [BUNA.source]: fixture("buna-listing.html"),
        [`${BUNA.source}?page=2`]: fixture("buna-listing.html"),
        [`${BUNA.source}?page=3`]: "<html></html>",
      }),
    );
    const rows = await scrapeTiendanube(BUNA, { fetchFn, delayFn: noDelay });
    expect(rows).toHaveLength(2);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("handles priceSpecification, protocol-relative images and plain url fields", async () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@type": "Product",
      name: "Colombia Prueba",
      url: "https://indigoroasters.com/productos/colombia-prueba/",
      sku: "PRUEBA-1",
      image: "//acdn-us.mitiendanube.com/stores/001/products/prueba.webp",
      weight: { "@type": "QuantitativeValue", unitCode: "GRM", value: "250" },
      offers: {
        "@type": "Offer",
        priceCurrency: "ARS",
        priceSpecification: { price: "31500" },
        availability: "https://schema.org/InStock",
      },
    })}</script>`;
    const fetchFn = makeFetch({
      [INDIGO.source]: html,
      [`${INDIGO.source}?page=2`]: "<html></html>",
    });
    const rows = await scrapeTiendanube(INDIGO, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      external_id: "PRUEBA-1",
      price: 31500,
      grams: 250,
      image_url: "https://acdn-us.mitiendanube.com/stores/001/products/prueba.webp",
    });
  });

  it("skips products without a usable price or url", async () => {
    const html = [
      {
        "@type": "Product",
        name: "Sin Precio",
        mainEntityOfPage: { "@id": "https://indigoroasters.com/productos/sin-precio/" },
        offers: { priceCurrency: "ARS", availability: "https://schema.org/InStock" },
      },
      {
        "@type": "Product",
        name: "Sin Url",
        sku: "X-1",
        offers: { price: "1000", priceCurrency: "ARS" },
      },
      {
        "@type": "Product",
        name: "Precio Cero",
        mainEntityOfPage: { "@id": "https://indigoroasters.com/productos/cero/" },
        offers: { price: "0", priceCurrency: "ARS" },
      },
    ]
      .map((product) => `<script type="application/ld+json">${JSON.stringify(product)}</script>`)
      .join("");
    const fetchFn = makeFetch({
      [INDIGO.source]: html,
      [`${INDIGO.source}?page=2`]: "<html></html>",
    });
    const rows = await scrapeTiendanube(INDIGO, { fetchFn, delayFn: noDelay });
    expect(rows).toEqual([]);
  });
});
