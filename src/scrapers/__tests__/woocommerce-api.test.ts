import { describe, expect, it, vi } from "vitest";
import type { RawProduct } from "@/lib/types";
import { scrapeWooApi } from "../woocommerce-api";
import type { WooApiStore } from "../stores";
import { getStore } from "../stores";
import { jsonFixture, makeFetch } from "./fixture";

const LIST_URL = "https://cafedelirante.com.ar/wp-json/wc/store/v1/products?per_page=100";
const config = () => getStore("cafedelirante") as WooApiStore;
const list = () =>
  jsonFixture<Record<string, unknown>[]>("cafedelirante-list.json");
const variationRoutes = (...ids: number[]): Record<string, unknown> =>
  Object.fromEntries(
    ids.map((id) => [
      `https://cafedelirante.com.ar/wp-json/wc/store/v1/products/${id}`,
      jsonFixture(`cafedelirante-variation-${id}.json`),
    ]),
  );

function rowsByName(rows: RawProduct[], needle: string): RawProduct[] {
  return rows.filter((row) => row.name.includes(needle));
}

describe("scrapeWooApi", () => {
  it("expands variable products into one row per weight", async () => {
    const fetchFn = makeFetch({
      [LIST_URL]: list(),
      ...variationRoutes(39119, 39120, 7217, 7218, 39234),
    });
    const rows = await scrapeWooApi(config(), { fetchFn });

    const summary = rows.map((row) => ({
      id: row.external_id,
      grams: row.grams,
      price: row.price,
    }));
    expect(summary).toEqual([
      { id: "104020001-4020002-1-1000", grams: 1000, price: 149900 },
      { id: "104020001-4020002-1-250", grams: 250, price: 42900 },
      { id: "105010000-3-1-10", grams: 250, price: 24000 },
      { id: "105010000-1000", grams: 1000, price: 74000 },
      { id: "105010000-250", grams: 250, price: 20900 },
      { id: "105010000-3000", grams: 3000, price: 194900 },
    ]);
    expect(rows.every((row) => row.store === "cafedelirante")).toBe(true);
    expect(rows.every((row) => row.roaster === "Café Delirante")).toBe(true);
    expect(rows.every((row) => row.in_stock === true)).toBe(true);
  });

  it("uses the variation permalink and image for expanded rows", async () => {
    const fetchFn = makeFetch({
      [LIST_URL]: list(),
      ...variationRoutes(39119, 39120),
    });
    const rows = await scrapeWooApi(config(), { fetchFn });
    const kilo = rowsByName(rows, "Maragogype").find((row) => row.grams === 1000);
    const quarter = rowsByName(rows, "Maragogype").find((row) => row.grams === 250);
    const variation250 = jsonFixture<{ permalink: string; images: { src: string }[] }>(
      "cafedelirante-variation-39120.json",
    );
    expect(kilo?.url).toBe(
      "https://cafedelirante.com.ar/tienda/cafe/cafe-de-panama-maragogype-rojo/?attribute_pa_elegi-tu-molienda=en-grano&attribute_pa_elegi-el-peso=1-kilo",
    );
    expect(quarter?.url).toBe(variation250.permalink);
    expect(quarter?.image_url).toBe(variation250.images[0].src);
  });

  it("skips excluded categories and keeps simple coffee products", async () => {
    const fetchFn = makeFetch({
      [LIST_URL]: list(),
      ...variationRoutes(39119, 39120, 7217, 7218, 39234),
    });
    const rows = await scrapeWooApi(config(), { fetchFn });
    expect(rows.some((row) => row.name.includes("Dripper"))).toBe(false);
    expect(rows.some((row) => row.name.includes("Drip Coffee Mix"))).toBe(true);
  });

  it("falls back to a single parent row when variation fetches fail", async () => {
    const fetchFn = makeFetch({ [LIST_URL]: list() });
    const rows = await scrapeWooApi(config(), { fetchFn });
    expect(rows).toHaveLength(3);
    const maragogype = rowsByName(rows, "Maragogype")[0];
    // No default weight term: the first parseable one ("1 Kilo") wins.
    expect(maragogype).toMatchObject({
      external_id: "104020001-4020002-1",
      grams: 1000,
      price: 42900,
      in_stock: true,
    });
    const blend = rowsByName(rows, "Blend de la Casa")[0];
    expect(blend).toMatchObject({ external_id: "105010000", grams: 250, price: 20900 });
  });

  it("parses grams from a single weight term on parent-level rows", async () => {
    const base = list().find((p) => p.id === 38287) as Record<string, unknown>;
    const single = {
      ...base,
      id: 99,
      sku: "SINGLE-1",
      slug: "cafe-unica",
      name: "Café Única",
      attributes: [
        {
          name: "Elegí el Peso",
          taxonomy: "pa_elegi-el-peso",
          has_variations: true,
          terms: [{ id: 1, name: "250 Gr.", slug: "250-gr" }],
        },
      ],
      variations: [],
      is_in_stock: true,
    };
    const fetchFn = makeFetch({ [LIST_URL]: [single] });
    const rows = await scrapeWooApi(config(), { fetchFn });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ external_id: "SINGLE-1", grams: 250, price: 24000 });
  });

  it("fallbacks to the product name and then the API weight for grammage", async () => {
    const base = list().find((p) => p.id === 38287) as Record<string, unknown>;
    const fetchFn = makeFetch({
      [LIST_URL]: [
        {
          ...base,
          id: 9701,
          sku: "NAME-1",
          name: "Colombia Tolima – 250 GRS",
          attributes: [],
          variations: [],
          weight: "0.5",
        },
        {
          ...base,
          id: 9702,
          sku: "WEIGHT-1",
          name: "Brasil Descafeinado- 250",
          attributes: [],
          variations: [],
          weight: "0.25",
        },
      ],
    });
    const rows = await scrapeWooApi(config(), { fetchFn });

    // The name wins over the (shipping) weight.
    expect(rowsByName(rows, "Colombia Tolima")[0].grams).toBe(250);
    // With no grammage in the name, the API weight ("0.25" kg) is used.
    expect(rowsByName(rows, "Brasil Descafeinado")[0].grams).toBe(250);
  });

  it("takes the default weight term on parent rows that also carry other attributes", async () => {
    const molienda = {
      name: "Elegí tu Molienda",
      taxonomy: "pa_elegi-tu-molienda",
      has_variations: true,
      terms: [
        { id: 1, name: "En Grano", slug: "en-grano" },
        { id: 2, name: "Molido Filtro", slug: "molido-filtro" },
      ],
    };
    const withPeso = {
      id: 900,
      sku: "MULTI-1",
      slug: "drip-multi",
      name: "Drip Coffee Mix cafés",
      prices: { price: "24000" },
      attributes: [
        molienda,
        {
          name: "Elegí el Peso",
          taxonomy: "pa_elegi-el-peso",
          has_variations: true,
          terms: [
            { id: 11, name: "1 Kilo", slug: "1-kilo" },
            { id: 12, name: "250 Gr.", slug: "250-gr", default: true },
          ],
        },
      ],
      variations: [],
      is_in_stock: true,
    };
    const grindOnly = {
      id: 901,
      sku: "GRIND-1",
      slug: "blend-molido",
      name: "Blend Solo Molienda",
      prices: { price: "18000" },
      attributes: [molienda],
      variations: [],
      is_in_stock: true,
    };
    const fetchFn = makeFetch({ [LIST_URL]: [withPeso, grindOnly] });
    const rows = await scrapeWooApi(config(), { fetchFn });

    expect(rows).toHaveLength(2);
    expect(rowsByName(rows, "Drip Coffee Mix")[0].grams).toBe(250);
    expect(rowsByName(rows, "Blend Solo Molienda")[0].grams).toBeNull();
  });

  it("skips out-of-stock products without fetching variations", async () => {
    const product = list().find((entry) => entry.id === 39118) as Record<string, unknown>;
    const fetchFn = vi.fn(makeFetch({ [LIST_URL]: [{ ...product, is_in_stock: false }] }));
    const rows = await scrapeWooApi(config(), { fetchFn });
    expect(rows).toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("falls back to the slug when sku is empty", async () => {
    const source = list().find((p) => p.id === 38287) as Record<string, unknown>;
    const fetchFn = makeFetch({
      [LIST_URL]: [{ ...source, sku: "" }],
    });
    const rows = await scrapeWooApi(config(), { fetchFn });
    expect(rows).toHaveLength(1);
    expect(rows[0].external_id).toBe(source.slug);
  });

  it("does not scale prices by currency_minor_unit 0", async () => {
    const fetchFn = makeFetch({
      [LIST_URL]: list(),
      ...variationRoutes(39119, 39120, 7217, 7218, 39234),
    });
    const rows = await scrapeWooApi(config(), { fetchFn });
    const prices = rows.map((row) => row.price);
    expect(prices).toContain(42900);
    expect(prices).not.toContain(429);
  });

  it("scales prices down when currency_minor_unit is 2", async () => {
    const base = list().find((p) => p.id === 38287) as Record<string, unknown>;
    const fetchFn = makeFetch({
      [LIST_URL]: [
        {
          ...base,
          variations: [],
          sku: "CENTS-1",
          name: "Café Centavos 250 GRS",
          prices: { price: "7310000", currency_minor_unit: 2 },
        },
      ],
    });
    const rows = await scrapeWooApi(config(), { fetchFn });

    expect(rows).toHaveLength(1);
    expect(rows[0].price).toBe(73100);
  });

  it("reads prices.price as the current price when regular_price is higher", async () => {
    const discounted = {
      id: 999001,
      name: "Café En Oferta",
      slug: "cafe-en-oferta",
      permalink: "https://cafedelirante.com.ar/tienda/cafe/cafe-en-oferta/",
      sku: "OFERTA-250",
      is_in_stock: true,
      prices: {
        price: "20000",
        regular_price: "25000",
        sale_price: "20000",
        currency_minor_unit: 0,
      },
    };
    const fetchFn = makeFetch({ [LIST_URL]: [discounted] });
    const rows = await scrapeWooApi(config(), { fetchFn });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ external_id: "OFERTA-250", price: 20000 });
  });

  it("turns the free-shipping threshold in short_description into a shipping note", async () => {
    const base = list().find((p) => p.id === 38287) as Record<string, unknown>;
    const fetchFn = makeFetch({
      [LIST_URL]: [
        {
          ...base,
          variations: [],
          sku: "THRESHOLD-1",
          short_description: "<p>GRATIS EN COMPRAS MAYORES A $70.000</p>",
        },
      ],
    });
    const rows = await scrapeWooApi(config(), { fetchFn });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      shipping_note: "Envío gratis desde $70.000",
      free_shipping: null,
      installments: null,
    });
  });

  it("keeps the dots of a thousands-separated threshold", async () => {
    const base = list().find((p) => p.id === 38287) as Record<string, unknown>;
    const fetchFn = makeFetch({
      [LIST_URL]: [
        { ...base, variations: [], sku: "THRESHOLD-2", short_description: "GRATIS EN COMPRAS MAYORES A $80.000" },
      ],
    });
    const rows = await scrapeWooApi(config(), { fetchFn });

    expect(rows[0].shipping_note).toBe("Envío gratis desde $80.000");
  });

  it("joins a threshold the shop splits across inline tags", async () => {
    const base = list().find((p) => p.id === 38287) as Record<string, unknown>;
    const fetchFn = makeFetch({
      [LIST_URL]: [
        {
          ...base,
          variations: [],
          sku: "THRESHOLD-3",
          short_description:
            '<p>Envíos a todo el país.</p><p><span style="color: #192951"><strong>GRATIS EN COMPRAS MAYORES A $70</strong></span><span style="color: #192951"><strong>.000</strong></span></p>',
        },
      ],
    });
    const rows = await scrapeWooApi(config(), { fetchFn });

    expect(rows[0].shipping_note).toBe("Envío gratis desde $70.000");
  });

  it("leaves the shipping fields null when short_description carries no threshold", async () => {
    const base = list().find((p) => p.id === 38287) as Record<string, unknown>;
    const fetchFn = makeFetch({
      [LIST_URL]: [{ ...base, variations: [], sku: "NO-THRESHOLD", short_description: "<p>Tostado lunes</p>" }],
    });
    const rows = await scrapeWooApi(config(), { fetchFn });

    expect(rows[0]).toMatchObject({
      shipping_note: null,
      free_shipping: null,
      installments: null,
    });
  });

  it("decodes HTML entities left in product names", async () => {
    const base = list().find((p) => p.id === 38287) as Record<string, unknown>;
    const fetchFn = makeFetch({
      [LIST_URL]: [
        {
          ...base,
          id: 9801,
          sku: "ENT-1",
          name: "Bolivia &#8211; 1 KG",
          attributes: [],
          variations: [],
          weight: "1",
        },
        {
          ...base,
          id: 9802,
          sku: "ENT-2",
          name: "REFIL &#8211; BLEND COLOMBIA &#038; BRASIL &#8211; 250 GRS",
          attributes: [],
          variations: [],
          weight: "0.25",
        },
      ],
    });
    const rows = await scrapeWooApi(config(), { fetchFn });

    expect(rowsByName(rows, "Bolivia – 1 KG")).toHaveLength(1);
    expect(rowsByName(rows, "REFIL – BLEND COLOMBIA & BRASIL – 250 GRS")).toHaveLength(1);
  });

  it("applies the store grams override when the API weight is a shipping weight", async () => {
    const cofijaus = getStore("cofijaus") as WooApiStore;
    const dripBag = {
      id: 3728,
      name: "Drip Bag Colombia Tolima",
      slug: "drip-bag-colombia-tolima",
      sku: "DRIP7",
      permalink: "https://cofijaus.com.ar/producto/drip-bag-colombia-tolima/",
      prices: { price: "2700000", currency_minor_unit: 2 },
      attributes: [],
      variations: [],
      weight: "0.5",
      is_in_stock: true,
    };
    const fetchFn = makeFetch({ [cofijaus.source]: [dripBag] });
    const rows = await scrapeWooApi(cofijaus, { fetchFn });

    expect(rows).toHaveLength(1);
    // 10 sobres de 16,5 g: the API "0.5" is the box weight, not the coffee.
    expect(rows[0]).toMatchObject({ external_id: "DRIP7", grams: 165, price: 27000 });
  });

  it("derives combo total grams from the store description", async () => {
    const cofijaus = getStore("cofijaus") as WooApiStore;
    const filler = "Altura: 1.950 - 2.300 msnm. Cultivar: 50% Colombia 50% Brasil. 0,5 l de agua.";
    const combo = (
      id: number,
      slug: string,
      name: string,
      weight: string,
      description: string,
    ) => ({
      id,
      name,
      slug,
      sku: "",
      description,
      permalink: `https://cofijaus.com.ar/producto/${slug}/`,
      prices: { price: "5360000", currency_minor_unit: 2 },
      attributes: [],
      variations: [],
      weight,
      is_in_stock: true,
    });
    const products = [
      combo(7307, "combo-250grs", "COMBO 250 GRS COLOMBIA Y ETHIOPIA", "0.25",
        `¿Qué estas eligiendo? Incluye 250grs de Colombia+ 250grs de Ethiopia. ${filler}`),
      combo(8096, "combo-250-grs-brasil-y-bolivia", "COMBO 250 GRS BRASIL Y BOLIVIA", "0.25",
        `Incluye 250grs de Brasil+ 250grs de Bolivia, dos perfiles. ${filler}`),
      combo(8089, "combo-250-grs-ethiopia-y-brasil", "COMBO 250 GRS  ETHIOPIA Y BRASIL", "0.25",
        `Incluye 250grs de Ethiopia+ 250grs de Brasil. ${filler}`),
      combo(7294, "combo-500grs", "COMBO 500 GRS BRASIL Y COLOMBIA", "0.5",
        `Incluye 500grs de Brasil+ 500grs de Colombia. ${filler}`),
      combo(8082, "combo-500-grs-colombia-y-ethiopia", "COMBO 500 GRS COLOMBIA Y ETHIOPIA", "0.5",
        `Incluye 500grs de Colombia Tolima+ 500grs de Ethiopia. ${filler}`),
      combo(8075, "combo-500-grs-blend-y-ethiopia", "COMBO 500 GRS BLEND Y ETHIOPIA", "0.5",
        `Incluye 500grs de Blend+ 500grs de Ethiopia. ${filler}`),
      combo(7282, "combo-favoritos-kilo", "COMBO 1 KG COLOMBIA Y ETHIOPIA", "1",
        `Incluye 1kg de Colombia+ 1kg de Ethiopia. ${filler}`),
      combo(8059, "combo-1-kg-colombia-y-blend", "COMBO 1 KG COLOMBIA Y BLEND", "1",
        `Incluye 1kg de Colombia Tolima+ 1kg de Blend Colombia-Brasil. ${filler}`),
      combo(8052, "combo-1-kg-ethiopia-y-brasil", "COMBO 1 KG ETHIOPIA Y BRASIL", "1",
        `Incluye 1kg de Ethiopia + 1kg de Brasil. ${filler}`),
    ];
    const fetchFn = makeFetch({ [cofijaus.source]: products });
    const rows = await scrapeWooApi(cofijaus, { fetchFn });

    // 250 g combos ship 2 x 250 g bags (500 g total), 500 g combos 2 x 500 g
    // (1 kg total) and 1 kg combos 2 x 1 kg (2 kg total).
    expect(rows.map((row) => row.grams).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([
      500, 500, 500, 1000, 1000, 1000, 2000, 2000, 2000,
    ]);
  });

  it("derives sachet-box totals from the description", async () => {
    const cofijaus = getStore("cofijaus") as WooApiStore;
    const dripBag = {
      id: 3728,
      name: "Drip Bag Colombia Tolima",
      slug: "drip-bag-colombia-tolima",
      sku: "",
      description:
        "Llevá la experiencia de un café de especialidad a cualquier lugar. Caja x 10 sobres de 16,5gr",
      permalink: "https://cofijaus.com.ar/producto/drip-bag-colombia-tolima/",
      prices: { price: "2700000", currency_minor_unit: 2 },
      attributes: [],
      variations: [],
      weight: "0.5",
      is_in_stock: true,
    };
    const fetchFn = makeFetch({ [cofijaus.source]: [dripBag] });
    const rows = await scrapeWooApi(cofijaus, { fetchFn });

    // 10 sobres de 16,5 g: the description states the real coffee weight.
    expect(rows[0]).toMatchObject({ external_id: "drip-bag-colombia-tolima", grams: 165 });
  });

  it("ignores single weight mentions and non-incluye descriptions", async () => {
    const cofijaus = getStore("cofijaus") as WooApiStore;
    const product = {
      id: 9999,
      name: "Colombia Tolima - 1KG",
      slug: "colombia-tolima-1kg",
      sku: "",
      description: "Perfil de taza jugoso durazno y fresca naranja. Altura 1.950 msnm.",
      permalink: "https://cofijaus.com.ar/producto/colombia-tolima-1kg/",
      prices: { price: "7480000", currency_minor_unit: 2 },
      attributes: [],
      variations: [],
      weight: "0.5",
      is_in_stock: true,
    };
    const fetchFn = makeFetch({ [cofijaus.source]: [product] });
    const rows = await scrapeWooApi(cofijaus, { fetchFn });

    // Falls through to the name, which states 1 KG.
    expect(rows[0]).toMatchObject({ external_id: "colombia-tolima-1kg", grams: 1000 });
  });
});
