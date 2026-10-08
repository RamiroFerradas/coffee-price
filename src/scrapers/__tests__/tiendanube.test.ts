import { describe, expect, it, vi } from "vitest";
import { scrapeTiendanube } from "../tiendanube";
import { getStore, type TiendanubeStore } from "../stores";
import { fixture, makeFetch } from "./fixture";

const INDIGO = getStore("indigoroasters") as TiendanubeStore;
const MOMO = getStore("momotostadores") as TiendanubeStore;
const BUNA = getStore("bunatostadores") as TiendanubeStore;
const MODO = getStore("modobarista") as TiendanubeStore;
const KAPS = getStore("kapselmaker") as TiendanubeStore;
const JJ = getStore("johnandjoe") as TiendanubeStore;
const FUEGO = getStore("fuegotostadores") as TiendanubeStore;

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
    // JSON-LD weight is missing, but the name publishes it.
    expect(sidra).toMatchObject({ in_stock: false, grams: 250 });
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

  it("falls back to the product name when the store publishes no usable weight", async () => {
    // No usable weight: johnandjoe-style stores must still read "Pack Kilo" titles
    // when JSON-LD weight is missing or a Tiendanube shipping placeholder.
    const html = [
      {
        "@type": "Product",
        name: "Etiopia Shonora - Pack Kilo",
        url: "https://indigoroasters.com/productos/etiopia-shonora-pack-kilo/",
        sku: "ETIO-1",
        weight: { "@type": "QuantitativeValue", unitCode: "KGM", value: "0.001" },
        offers: { priceCurrency: "ARS", price: "30000", availability: "https://schema.org/InStock" },
      },
      {
        "@type": "Product",
        name: "Colombia Tolima - Pack Kilo",
        url: "https://indigoroasters.com/productos/colombia-tolima-pack-kilo/",
        sku: "COL-TOL-1",
        offers: { priceCurrency: "ARS", price: "32000", availability: "https://schema.org/InStock" },
      },
    ]
      .map((product) => `<script type="application/ld+json">${JSON.stringify(product)}</script>`)
      .join("");
    const fetchFn = makeFetch({
      [INDIGO.source]: html,
      [`${INDIGO.source}?page=2`]: "<html></html>",
    });
    const rows = await scrapeTiendanube(INDIGO, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.grams)).toEqual([1000, 1000]);
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

describe("scrapeTiendanube discounted prices", () => {
  it("prefers the rendered current price over the pre-discount JSON-LD price on kapselmaker", async () => {
    const fetchFn = vi.fn(
      makeFetch({
        [KAPS.source]: fixture("kapselmaker-sale-listing.html"),
        [`${KAPS.source}?page=2`]: "<html></html>",
      }),
    );
    const rows = await scrapeTiendanube(KAPS, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      external_id: "CVLATAGRANDELICIA",
      name: "Delicia en grano",
      url: "https://kapselmaker.com/productos/delicia-en-grano/",
      price: 47100,
    });
  });

  it("prefers the rendered current price over the struck-through JSON-LD price on bunatostadores", async () => {
    const fetchFn = vi.fn(
      makeFetch({
        [BUNA.source]: fixture("buna-sale-listing.html"),
        [`${BUNA.source}?page=2`]: "<html></html>",
      }),
    );
    const rows = await scrapeTiendanube(BUNA, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Colibrí 250gr",
      url: "https://bunatostadores.com.ar/productos/colibri-250gr-n0cap/",
      price: 26000,
    });
  });

  it("prefers the rendered current price over the pre-discount JSON-LD price on johnandjoe", async () => {
    const fetchFn = vi.fn(
      makeFetch({
        [JJ.source]: fixture("johnandjoe-sale-listing.html"),
        [`${JJ.source}?page=2`]: "<html></html>",
      }),
    );
    const rows = await scrapeTiendanube(JJ, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      url: "https://johnandjoe.com.ar/productos/combo-capsulas-de-cafe-de-especialidad-x120/",
      price: 143500,
    });
  });

  it("parses the current price when the rendered card and JSON-LD agree without a discount", async () => {
    const html = [
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "Colombia Prueba",
        url: "https://indigoroasters.com/productos/colombia-prueba/",
        sku: "PRUEBA-2",
        offers: { priceCurrency: "ARS", price: "31500", availability: "https://schema.org/InStock" },
      })}</script>`,
      `<a href="https://indigoroasters.com/productos/colombia-prueba/">card</a>`,
      `<span class="js-price-display item-price" data-product-price="3150000"> $31.500,00 </span>`,
    ].join("");
    const fetchFn = makeFetch({
      [INDIGO.source]: html,
      [`${INDIGO.source}?page=2`]: "<html></html>",
    });
    const rows = await scrapeTiendanube(INDIGO, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ external_id: "PRUEBA-2", price: 31500 });
  });
});

describe("scrapeTiendanube modobarista", () => {
  const routes = () => ({
    [MODO.source]: fixture("modobarista-listing.html"),
    [`${MODO.source}?page=2`]: "<html><body>no products</body></html>",
  });

  it("scrapes the specialty category and stops at the first empty page", async () => {
    const fetchFn = vi.fn(makeFetch(routes()));
    const rows = await scrapeTiendanube(MODO, { fetchFn, delayFn: noDelay });

    expect(fetchFn.mock.calls.map((call) => call[0])).toEqual([
      MODO.source,
      `${MODO.source}?page=2`,
    ]);
    expect(rows).toHaveLength(6);
    expect(rows[0]).toMatchObject({
      store: "modobarista",
      roaster: "Modo Barista",
      external_id: "CATOBLPR250",
      name: "Bloom Blend - Edición de Primavera",
      url: "https://www.modobarista.com/productos/cafe-de-especialidad-blend-primavera-bloom/",
      price: 21175,
      in_stock: true,
    });
    expect(rows[0].image_url?.startsWith("https://acdn-us.mitiendanube.com")).toBe(true);
    expect(rows.every((row) => row.price > 0)).toBe(true);
  });

  it("takes grams from the sku before the shipping-default ld weight", async () => {
    const fetchFn = makeFetch(routes());
    const rows = await scrapeTiendanube(MODO, { fetchFn, delayFn: noDelay });

    expect(Object.fromEntries(rows.map((row) => [row.external_id, row.grams]))).toEqual({
      CATOBLPR250: 250,
      CATOET125: 125,
      CATOHO01250: 250,
      CATOWW06125: 125,
      // Name and sku carry no grammage, so the ld weight (0.1 kg) is the last resort.
      YOLLECA: 100,
      CATOCOCO250: 250,
    });
  });
});

describe("scrapeTiendanube weight variants", () => {
  const PRODUCT_URL = "https://www.modobarista.com/productos/cafe-de-especialidad-bloom/";

  const encodeAttr = (variants: unknown): string =>
    JSON.stringify(variants).replaceAll("&", "&amp;").replaceAll('"', "&quot;");

  const ldProduct = (
    overrides: Record<string, unknown> = {},
  ): string =>
    `<script type="application/ld+json">${JSON.stringify({
      "@type": "Product",
      name: "Bloom Blend - Edición de Primavera",
      url: PRODUCT_URL,
      sku: "CATOBLPR250",
      weight: { "@type": "QuantitativeValue", unitCode: "KGM", value: "0.25" },
      offers: {
        "@type": "Offer",
        priceCurrency: "ARS",
        price: "21175",
        availability: "https://schema.org/InStock",
      },
      ...overrides,
    })}</script>`;

  const modoVariants = [
    {
      product_id: 1,
      sku: "CATOBLPR250",
      available: true,
      option0: "250 gr",
      option1: "Grano",
      option2: null,
      id: 11,
      price_number: 21175,
      has_promotional_price: false,
      promotional_price_number: null,
    },
    {
      product_id: 1,
      sku: "CATOBLPR250M",
      available: true,
      option0: "250 gr",
      option1: "Molido",
      option2: null,
      id: 12,
      price_number: 21175,
      has_promotional_price: false,
      promotional_price_number: null,
    },
    {
      product_id: 1,
      sku: "CATOBLPR1KG",
      available: true,
      option0: "1 Kilo",
      option1: "Grano",
      option2: null,
      id: 13,
      price_number: 88000,
      has_promotional_price: true,
      promotional_price_number: 79000,
    },
    {
      product_id: 1,
      sku: "CATOBLPR1KGM",
      available: false,
      option0: "1 Kilo",
      option1: "Molido",
      option2: null,
      id: 14,
      price_number: 88000,
      has_promotional_price: true,
      promotional_price_number: 79000,
    },
  ];

  it("expands a modo-style multi-weight data-variants card into one row per weight", async () => {
    const card = `<div class="js-item-product" data-product-id="1" data-variants="${encodeAttr(modoVariants)}"><div class="img"><a href="${PRODUCT_URL}">Bloom</a></div></div>`;
    const fetchFn = makeFetch({
      [MODO.source]: ldProduct() + card,
      [`${MODO.source}?page=2`]: "<html><body>no products</body></html>",
    });
    const rows = await scrapeTiendanube(MODO, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.external_id)).size).toBe(2);

    const quarterKg = rows.find((row) => row.external_id === "CATOBLPR250");
    expect(quarterKg).toMatchObject({
      store: "modobarista",
      name: "Bloom Blend - Edición de Primavera",
      url: PRODUCT_URL,
      price: 21175,
      grams: 250,
      in_stock: true,
    });

    const kilo = rows.find((row) => row.external_id === "CATOBLPR1KG");
    expect(kilo).toMatchObject({
      price: 79000,
      grams: 1000,
      in_stock: true,
    });
  });

  it("keeps a single row when the variant options carry only grind values", async () => {
    const grindOnly = [
      {
        product_id: 2,
        sku: "CATOBLPR250",
        available: true,
        option0: "Grano",
        option1: null,
        option2: null,
        id: 21,
        price_number: 21175,
        has_promotional_price: false,
        promotional_price_number: null,
      },
      {
        product_id: 2,
        sku: "CATOBLPR250M",
        available: true,
        option0: "Molido Espresso",
        option1: null,
        option2: null,
        id: 22,
        price_number: 21175,
        has_promotional_price: false,
        promotional_price_number: null,
      },
    ];
    const card = `<div class="js-item-product" data-product-id="2" data-variants="${encodeAttr(grindOnly)}"><div class="img"><a href="${PRODUCT_URL}">Bloom</a></div></div>`;
    const fetchFn = makeFetch({
      [MODO.source]: ldProduct() + card,
      [`${MODO.source}?page=2`]: "<html><body>no products</body></html>",
    });
    const rows = await scrapeTiendanube(MODO, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      external_id: "CATOBLPR250",
      price: 21175,
      grams: 250,
      in_stock: true,
    });
  });

  it("prefers the #single-product data-variants payload on detail pages", async () => {
    const detail = [
      `<link rel="canonical" href="${PRODUCT_URL}" />`,
      ldProduct(),
      `<div id="single-product" class="js-product-detail" data-variants="${encodeAttr(modoVariants)}"><div class="gallery"><a href="//acdn-us.mitiendanube.com/stores/004/products/img.webp">gallery</a></div></div>`,
    ].join("");
    const fetchFn = makeFetch({
      [MODO.source]: detail,
      [`${MODO.source}?page=2`]: "<html><body>no products</body></html>",
    });
    const rows = await scrapeTiendanube(MODO, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.external_id === "CATOBLPR250")?.grams).toBe(250);
    expect(rows.find((row) => row.external_id === "CATOBLPR1KG")).toMatchObject({
      price: 79000,
      grams: 1000,
    });
  });
});

describe("scrapeTiendanube kapselmaker", () => {
  const routes = () => ({
    [KAPS.source]: fixture("kapselmaker-listing.html"),
    [`${KAPS.source}?page=2`]: "<html><body>no products</body></html>",
  });

  it("scrapes the product listing with rounded prices and no grams", async () => {
    const fetchFn = vi.fn(makeFetch(routes()));
    const rows = await scrapeTiendanube(KAPS, { fetchFn, delayFn: noDelay });

    expect(fetchFn.mock.calls.map((call) => call[0])).toEqual([
      KAPS.source,
      `${KAPS.source}?page=2`,
    ]);
    expect(rows).toHaveLength(6);
    expect(rows[0]).toMatchObject({
      store: "kapselmaker",
      roaster: "Kapselmaker",
      external_id: "CVCAJAFRAN",
      name: "Francesca",
      url: "https://kapselmaker.com/productos/francesca/",
      price: 15100,
      grams: null,
      in_stock: true,
    });
    expect(rows[0].image_url?.startsWith("https://acdn-us.mitiendanube.com")).toBe(true);
    expect(Object.fromEntries(rows.map((row) => [row.external_id, row.price]))).toEqual({
      CVCAJAFRAN: 15100,
      CVLATAMOLDARKR: 15800,
      CVLATAGRANTUC: 17350,
      CVLATAGRANCREAV: 18250,
      CVCAJAVAIN: 17400,
      CVLATAMOLTOPKILO: 81000,
    });
    expect(rows.every((row) => row.grams === null)).toBe(true);
  });
});

describe("scrapeTiendanube kapselmaker grams from name", () => {
  const ldProduct = (name: string, weightValue: number) =>
    `<script type="application/ld+json">${JSON.stringify({
      "@type": "Product",
      name,
      url: `https://kapselmaker.com/productos/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}/`,
      sku: `SKU-${name.length}`,
      weight: { "@type": "QuantitativeValue", unitCode: "KGM", value: weightValue },
      offers: {
        "@type": "Offer",
        priceCurrency: "ARS",
        price: "45000",
        availability: "https://schema.org/InStock",
      },
    })}</script>`;

  it("takes grams from the product name because the ld weight is the shipping weight", async () => {
    const fetchFn = vi.fn(
      makeFetch({
        [KAPS.source]: ldProduct("Honduras / Finca La Granadilla 2.8kg", 3),
        [`${KAPS.source}?page=2`]: "<html><body>no products</body></html>",
      }),
    );
    const rows = await scrapeTiendanube(KAPS, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Honduras / Finca La Granadilla 2.8kg",
      grams: 2800,
    });
  });

  it("keeps the placeholder weight behavior when the name carries no grammage", async () => {
    const fetchFn = vi.fn(
      makeFetch({
        [KAPS.source]: ldProduct("Francesca", 0.001),
        [`${KAPS.source}?page=2`]: "<html><body>no products</body></html>",
      }),
    );
    const rows = await scrapeTiendanube(KAPS, { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Francesca", grams: null });
  });
});

describe("scrapeTiendanube grams precedence (name first)", () => {
  const productHtml = (
    store: TiendanubeStore,
    product: { name: string; sku?: string; weight?: string },
  ): string => {
    const ld: Record<string, unknown> = {
      "@type": "Product",
      name: product.name,
      url: `${store.baseUrl}/productos/prueba-grams/`,
      ...(product.sku ? { sku: product.sku } : {}),
      ...(product.weight !== undefined
        ? { weight: { "@type": "QuantitativeValue", unitCode: "KGM", value: product.weight } }
        : {}),
      offers: { priceCurrency: "ARS", price: "25000", availability: "https://schema.org/InStock" },
    };
    return `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
  };

  const scrape = async (store: TiendanubeStore, html: string) => {
    const fetchFn = makeFetch({
      [store.source]: html,
      [`${store.source}?page=2`]: "<html><body>no products</body></html>",
    });
    return scrapeTiendanube(store, { fetchFn, delayFn: noDelay });
  };

  it("takes grammage from the product name before the shipping weight", async () => {
    // Reported bug: fuegotostadores' 125 g bag ships with a 0.13 kg LD weight;
    // weight-first parsing published it as 130 g and the 130 g filter matched it.
    const rows = await scrape(
      FUEGO,
      productHtml(FUEGO, {
        name: "CAFÉ LÍNEA EXPERIMENTAL - COLOMBIA - 125G",
        sku: "C125(CO43HC)",
        weight: "0.13",
      }),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].grams).toBe(125);
  });

  it("falls back to the ld weight when the name carries no grammage", async () => {
    const rows = await scrape(
      FUEGO,
      productHtml(FUEGO, { name: "Blend Sin Gramaje", weight: "0.13" }),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].grams).toBe(130);
  });

  it("returns null when the name has no grammage and the weight is a placeholder", async () => {
    const rows = await scrape(
      FUEGO,
      productHtml(FUEGO, { name: "Blend Sin Gramaje", weight: "0.001" }),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].grams).toBeNull();
  });

  it("takes grammage from the sku when the name carries none", async () => {
    const rows = await scrape(
      MODO,
      productHtml(MODO, {
        name: "Café de especialidad Etiopía 01",
        sku: "CATOET125",
        weight: "0.1",
      }),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].grams).toBe(125);
  });

  it("prefers grammage in the name over the sku", async () => {
    const rows = await scrape(
      MODO,
      productHtml(MODO, {
        name: "Etiopía Especial - 250g",
        sku: "CATOET125",
        weight: "0.1",
      }),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].grams).toBe(250);
  });
});

describe("scrapeTiendanube fuegotostadores", () => {
  const routes = () => ({
    [FUEGO.source]: fixture("fuego-listing.html"),
    [`${FUEGO.source}?page=2`]: "<html><body>no products</body></html>",
  });

  it("parses the listing with name- and weight-consistent grammage", async () => {
    const fetchFn = vi.fn(makeFetch(routes()));
    const rows = await scrapeTiendanube(FUEGO, { fetchFn, delayFn: noDelay });

    expect(fetchFn.mock.calls.map((call) => call[0])).toEqual([
      FUEGO.source,
      `${FUEGO.source}?page=2`,
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.store === "fuegotostadores")).toBe(true);
    expect(rows.every((row) => row.in_stock)).toBe(true);
    expect(Object.fromEntries(rows.map((row) => [row.external_id, row.grams]))).toEqual({
      "C250C(BR23CO51)": 250,
      "C250(BR23CO51)": 250,
    });
    expect(Object.fromEntries(rows.map((row) => [row.external_id, row.price]))).toEqual({
      "C250C(BR23CO51)": 20700,
      "C250(BR23CO51)": 24600,
    });
  });
});

describe("scrapeTiendanube johnandjoe", () => {
  const routes = () => ({
    [JJ.source]: fixture("johnandjoe-listing.html"),
    [`${JJ.source}?page=2`]: fixture("johnandjoe-page2.html"),
    [`${JJ.source}?page=3`]: "<html><body>no products</body></html>",
  });

  it("walks both listing pages and skips quote-only products priced 0", async () => {
    const fetchFn = vi.fn(makeFetch(routes()));
    const rows = await scrapeTiendanube(JJ, { fetchFn, delayFn: noDelay });

    expect(fetchFn.mock.calls.map((call) => call[0])).toEqual([
      JJ.source,
      `${JJ.source}?page=2`,
      `${JJ.source}?page=3`,
    ]);
    // 55 published products minus the 3 quote-only ones listed at price 0
    expect(rows).toHaveLength(52);
    expect(rows.every((row) => row.price > 0)).toBe(true);
    const ids = rows.map((row) => row.external_id);
    expect(ids).not.toContain("molinillo-de-cafe");
    expect(ids).not.toContain("cafetera-dos-grupos");
    expect(ids).not.toContain("cafetera-un-grupo");
    expect(new Set(ids).size).toBe(rows.length);
    const prices = rows.map((row) => row.price);
    expect(Math.min(...prices)).toBe(23700);
    expect(Math.max(...prices)).toBe(168800);
  });

  it("recovers grammage from the title when the ld weight is missing or a placeholder", async () => {
    const fetchFn = makeFetch(routes());
    const rows = await scrapeTiendanube(JJ, { fetchFn, delayFn: noDelay });
    const grams = Object.fromEntries(rows.map((row) => [row.external_id, row.grams]));

    // Tiendanube ships 0.001 kg placeholder weights that would round to 1 g;
    // the title is the only source left for those products.
    expect(grams.ETIO_1).toBe(1000);
    expect(grams.COL_CAS_1).toBe(1000);
    expect(grams.COL_TOL_250).toBe(250);
    // Combos publish no grammage anywhere (weight placeholder, bare count in the name).
    expect(grams.COM_COL_360).toBeNull();
    expect(grams.COM_LATAM).toBeNull();
    expect(grams.ETIO_250).toBe(250);
    expect(grams["CAFE-GZVNZ-9"]).toBe(950);
    expect(grams.COL_POPA_1).toBe(1000);
    expect(Object.values(grams).filter((value) => value != null)).toHaveLength(50);
  });
});

describe("scrapeTiendanube shipping and installments", () => {
  const PRODUCT_URL = "https://indigoroasters.com/productos/prueba-envios/";
  const ESCAPED_URL = "https\\u003A\\/\\/indigoroasters.com\\/productos\\/prueba-envios\\/";

  const encodeAttr = (variants: unknown): string =>
    JSON.stringify(variants).replaceAll("&", "&amp;").replaceAll('"', "&quot;");

  const ldProduct = `<script type="application/ld+json">${JSON.stringify({
    "@type": "Product",
    name: "Colombia Prueba",
    url: PRODUCT_URL,
    sku: "PRUEBA-SHIP",
    offers: { priceCurrency: "ARS", price: "25000", availability: "https://schema.org/InStock" },
  })}</script>`;

  const loader = (flag: boolean) =>
    [
      "<script>",
      "  data: {",
      "    products: [",
      "      {",
      `        canonical_url: "${ESCAPED_URL}",`,
      `        free_shipping: ${flag},`,
      '        handle: { "es": "prueba-envios" }',
      "      }",
      "    ]",
      "  };",
      "</script>",
    ].join("");

  const variantCard = (installments: Record<string, unknown>): string =>
    `<div class="js-item-product" data-product-id="7" data-variants="${encodeAttr([
      {
        product_id: 7,
        sku: "PRUEBA-SHIP",
        available: true,
        option0: "250 gr",
        option1: null,
        option2: null,
        id: 71,
        price_number: 25000,
        has_promotional_price: false,
        promotional_price_number: null,
        installments_data: JSON.stringify(installments),
      },
    ])}"><div class="img"><a href="${PRODUCT_URL}">Prueba</a></div></div>`;

  async function scrape(pageHtml: string) {
    const fetchFn = makeFetch({
      [INDIGO.source]: pageHtml,
      [`${INDIGO.source}?page=2`]: "<html><body>no products</body></html>",
    });
    return scrapeTiendanube(INDIGO, { fetchFn, delayFn: noDelay });
  }

  it("reads the loader free_shipping flag for the matching product", async () => {
    const rows = await scrape(ldProduct + loader(true));

    expect(rows).toHaveLength(1);
    expect(rows[0].free_shipping).toBe(true);
  });

  it("keeps a loader free_shipping flag of false", async () => {
    const rows = await scrape(ldProduct + loader(false));

    expect(rows[0].free_shipping).toBe(false);
    expect(rows[0].shipping_note).toBeNull();
  });

  it("leaves shipping null when the page carries no loader state", async () => {
    const rows = await scrape(ldProduct);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      free_shipping: null,
      shipping_note: null,
      installments: null,
    });
  });

  it("takes the highest interest-free installment count from data-variants", async () => {
    const rows = await scrape(
      ldProduct +
        variantCard({
          "Mercado Pago": {
            "1": { installment_value: 25000, interest: 0, total_value: 25000, without_interests: true },
            "3": { installment_value: 8750, interest: 0, total_value: 26250, without_interests: true },
            "6": { installment_value: 4900, interest: 0.3, total_value: 29400, without_interests: false },
          },
        }),
    );

    expect(rows[0].installments).toBe("3 cuotas sin interés");
  });

  it("ignores plans that charge interest", async () => {
    const rows = await scrape(
      ldProduct +
        variantCard({
          "Pago Nube": {
            "3": { installment_value: 9000, interest: 0.19, total_value: 27000, without_interests: false },
            "6": { installment_value: 5000, interest: 0.32, total_value: 30000, without_interests: false },
          },
        }),
    );

    expect(rows[0].installments).toBeNull();
  });

  it("ignores an interest-free single payment because it is not an installment plan", async () => {
    const rows = await scrape(
      ldProduct +
        variantCard({
          "Mercado Pago": {
            "1": { installment_value: 25000, interest: 0, total_value: 25000, without_interests: true },
            "2": { installment_value: 13500, interest: 0.08, total_value: 27000, without_interests: false },
          },
        }),
    );

    expect(rows[0].installments).toBeNull();
  });

  it("stays null when the variants payload is malformed", async () => {
    const rows = await scrape(
      ldProduct +
        `<div class="js-item-product" data-product-id="7" data-variants="not-json"><div class="img"><a href="${PRODUCT_URL}">Prueba</a></div></div>`,
    );

    expect(rows[0]).toMatchObject({ installments: null, free_shipping: null });
  });
});

describe("scrapeTiendanube coffee specs", () => {
  it("extracts the structured block from momo descriptions", async () => {
    const fetchFn = makeFetch({
      [MOMO.source]: fixture("momo-listing.html"),
      ["https://www.momotostadores.com/page/2/productos/"]: "<html></html>",
    });
    const rows = await scrapeTiendanube(MOMO, { fetchFn, delayFn: noDelay });

    const sidra = rows.find((row) => row.name === "Sidra x 250g");
    expect(sidra).toMatchObject({
      tasting_notes: "Miel, cerezas, rosas",
      process: "Lavado",
      altitude: ">1900 msnm",
      roast_level: null,
      score: null,
    });

    const santaInes = rows.find((row) => row.name.startsWith("Santa Inés"));
    expect(santaInes).toMatchObject({
      tasting_notes: "Caramelo, cacao, frutos rojos",
      process: null,
      altitude: "900-1050 msnm",
      roast_level: null,
      score: null,
    });

    const tico = rows.find((row) => row.name === "Tico x 250g");
    expect(tico).toMatchObject({
      tasting_notes: null,
      process: null,
      altitude: null,
      roast_level: null,
      score: null,
    });
  });

  it("reads tasting notes from johnandjoe descriptions", async () => {
    const fetchFn = makeFetch({
      [JJ.source]: fixture("johnandjoe-listing.html"),
      [`${JJ.source}?page=2`]: fixture("johnandjoe-page2.html"),
      [`${JJ.source}?page=3`]: "<html><body>no products</body></html>",
    });
    const rows = await scrapeTiendanube(JJ, { fetchFn, delayFn: noDelay });
    const notes = Object.fromEntries(rows.map((row) => [row.external_id, row.tasting_notes]));

    expect(notes.ETIO_250).toBe("Cítricos, Té negro y Miel");
    expect(notes.ETIO_1).toBe("Cítricos, Té negro y Miel");
    expect(notes.COL_CAS_250).toBe(
      "Cacao, Mermelada de naranja, Melocotón, Azúcar morena, Lima",
    );
    expect(notes.COL_TOL_250).toBe("frutales y cítricas");
    expect(notes.BLE_GOAT_250).toBeNull();
  });

  it("reads the roast level from kapselmaker descriptions", async () => {
    const fetchFn = makeFetch({
      [KAPS.source]: fixture("kapselmaker-listing.html"),
      [`${KAPS.source}?page=2`]: "<html><body>no products</body></html>",
    });
    const rows = await scrapeTiendanube(KAPS, { fetchFn, delayFn: noDelay });
    const specs = Object.fromEntries(
      rows.map((row) => [row.external_id, { roast: row.roast_level, notes: row.tasting_notes }]),
    );

    expect(specs.CVLATAMOLDARKR).toEqual({ roast: "Oscuro", notes: null });
    expect(specs.CVLATAGRANTUC).toEqual({ roast: "Medio", notes: null });
    expect(specs.CVCAJAFRAN).toEqual({ roast: null, notes: null });
  });

  it("reads tasting notes and the process suffix from modobarista", async () => {
    const fetchFn = makeFetch({
      [MODO.source]: fixture("modobarista-listing.html"),
      [`${MODO.source}?page=2`]: "<html><body>no products</body></html>",
    });
    const rows = await scrapeTiendanube(MODO, { fetchFn, delayFn: noDelay });
    const specs = Object.fromEntries(
      rows.map((row) => [row.external_id, { process: row.process, notes: row.tasting_notes }]),
    );

    expect(specs.CATOHO01250).toEqual({ process: "Lavado", notes: "frutos secos y chocolate" });
    expect(specs.CATOWW06125).toEqual({ process: "Natural", notes: null });
    expect(specs.CATOBLPR250).toEqual({ process: null, notes: "frutales y dulces" });
    expect(specs.CATOCOCO250).toEqual({ process: null, notes: "manzana roja, durazno y miel" });
    expect(specs.CATOET125).toEqual({ process: null, notes: null });
  });

  it("reads tasting notes from indigo descriptions", async () => {
    const fetchFn = makeFetch({
      [INDIGO.source]: fixture("indigo-listing.html"),
      [`${INDIGO.source}?page=2`]: "<html></html>",
    });
    const rows = await scrapeTiendanube(INDIGO, { fetchFn, delayFn: noDelay });
    const notes = Object.fromEntries(rows.map((row) => [row.external_id, row.tasting_notes]));

    expect(notes.SAKG).toBe("caramelo, cítricos y chocolate semiamargo");
    expect(notes.SNKG).toBe("azúcar moreno, piel de limón y frutos secos");
  });
});
