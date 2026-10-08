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
});
