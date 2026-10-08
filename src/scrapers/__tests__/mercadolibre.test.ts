import { describe, expect, it, vi } from "vitest";
import { fixture, makeFetch } from "./fixture";
import {
  GOOGLEBOT_UA,
  extractMlFacetLinks,
  parseMlCards,
  parseMlTotal,
  scrapeMercadoLibre,
} from "../mercadolibre";
import { getStore, type MercadoLibreStore } from "../stores";

const IV_SOURCE = "https://listado.mercadolibre.com.ar/tienda/cafe-indios-verdes/";
const IV_FACET_OTRAS = `${IV_SOURCE}listado/alimentos-bebidas/almacen/infusiones/cafe/otras-presentaciones/`;
const IV_FACET_GRATIS = `${IV_SOURCE}listado/alimentos-bebidas/almacen/infusiones/cafe/_CostoEnvio_Gratis`;
const IV_FACET_PRICERANGE = `${IV_SOURCE}listado/alimentos-bebidas/almacen/infusiones/cafe/_PriceRange_0ARS-30000ARS`;
const DRUPA_SOURCE = "https://www.mercadolibre.com.ar/pagina/tiendafundador";
const IV_WWW = "https://www.mercadolibre.com.ar/tienda/cafe-indios-verdes";
const noDelay = () => Promise.resolve();

function ivStore(): MercadoLibreStore {
  return getStore("indiosverdes") as MercadoLibreStore;
}

function drupaStore(): MercadoLibreStore {
  return getStore("drupa") as MercadoLibreStore;
}

describe("parseMlTotal", () => {
  it("reads the visible result count from the root listing", () => {
    expect(parseMlTotal(fixture("ml-indiosverdes-listing.html"))).toBe(58);
  });

  it("returns null when the page shows no count", () => {
    expect(parseMlTotal('<div class="poly-card">x</div>')).toBeNull();
  });
});

describe("parseMlCards", () => {
  it("parses every card on the root listing", () => {
    const rows = parseMlCards(fixture("ml-indiosverdes-listing.html"), ivStore());
    expect(rows).toHaveLength(48);
    expect(new Set(rows.map((row) => row.external_id)).size).toBe(48);
  });

  it("extracts price, stripped url, id, image and grams from a card", () => {
    const rows = parseMlCards(fixture("ml-indiosverdes-listing.html"), ivStore());
    expect(rows[0]).toMatchObject({
      store: "indiosverdes",
      external_id: "MLA1480504025",
      name: "Café en en grano o molido Café Indios Verdes Promo Variedades + Ristretto Tostado en bolsa sin TACC 250 g pack x 5",
      url: "https://www.mercadolibre.com.ar/cafe-en-en-grano-o-molido-cafe-indios-verdes-promo-variedades-ristretto-tostado-en-bolsa-sin-tacc-250-g-pack-x-5/p/MLA44695659",
      image_url: "https://http2.mlstatic.com/D_Q_NP_2X_720670-MLA99831976237_112025-E.webp",
      roaster: "Café Indios Verdes",
      price: 79540,
      grams: 1250,
      in_stock: true,
    });
  });

  it("prefers the discounted current price over the struck previous price", () => {
    const rows = parseMlCards(fixture("ml-drupa-pagina.html"), drupaStore());
    expect(rows.some((row) => row.price === 67224)).toBe(true);
    expect(rows.some((row) => row.price === 74900)).toBe(false);
  });

  it("takes the first price block when a card renders more than one", () => {
    const html = `
      <div class="andes-card poly-card">
        <a href="https://www.mercadolibre.com.ar/x/p/MLA1?wid=MLA9" class="poly-component__title">Foo 250 g</a>
        <div class="poly-component__price">
          <div class="poly-price__current"><span aria-label="10000 pesos argentinos"></span></div>
          <div class="poly-price__current"><span aria-label="20000 pesos argentinos"></span></div>
        </div>
      </div>`;
    expect(parseMlCards(html, ivStore())[0].price).toBe(10000);
  });

  it("flags cards that say sin stock as unavailable", () => {
    const html = `
      <div class="andes-card poly-card">
        <a href="https://www.mercadolibre.com.ar/x/p/MLA2?wid=MLA8" class="poly-component__title">Café Blend 250 g</a>
        <div class="poly-component__price"><div class="poly-price__current"><span aria-label="9000 pesos argentinos"></span></div></div>
        <div class="poly-shipping-v2__item">Sin stock</div>
      </div>`;
    expect(parseMlCards(html, ivStore())[0].in_stock).toBe(false);
  });
});

describe("extractMlFacetLinks", () => {
  it("collects every facet and corridor link under the store source", () => {
    const links = extractMlFacetLinks(fixture("ml-indiosverdes-listing.html"), IV_SOURCE);
    expect(links).toHaveLength(22);
    expect(links).toEqual(
      expect.arrayContaining([IV_FACET_OTRAS, IV_FACET_GRATIS, IV_FACET_PRICERANGE]),
    );
    expect(links).not.toContain(IV_SOURCE);
    expect(new Set(links).size).toBe(links.length);
  });

  it("ignores links outside the source", () => {
    const html =
      '<a href="https://listado.mercadolibre.com.ar/otra-tienda/_BRAND_1">x</a>' +
      '<a href="https://www.mercadolibre.com.ar/foo">y</a>' +
      '<a href="https://listado.mercadolibre.com.ar/tienda/otra/">z</a>';
    expect(extractMlFacetLinks(html, IV_SOURCE)).toEqual([]);
  });
});

describe("scrapeMercadoLibre indiosverdes coverage", () => {
  it("unions the root listing with facet pages until the reported total is reached", async () => {
    const fetchFn = makeFetch({
      [IV_SOURCE]: fixture("ml-indiosverdes-listing.html"),
      [IV_FACET_OTRAS]: fixture("ml-indiosverdes-facet-otras.html"),
      [IV_FACET_GRATIS]: fixture("ml-indiosverdes-facet-gratis.html"),
      [IV_FACET_PRICERANGE]: fixture("ml-indiosverdes-facet-pricerange.html"),
    });

    const rows = await scrapeMercadoLibre(ivStore(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(58);
    expect(new Set(rows.map((row) => row.external_id)).size).toBe(58);
    expect(rows.every((row) => row.store === "indiosverdes")).toBe(true);
    expect(rows.every((row) => row.price > 0)).toBe(true);
    expect(rows.every((row) => row.url.length > 0)).toBe(true);
  });

  it("throws loudly when the facet sweep cannot reach the reported total", async () => {
    const fetchFn = makeFetch({ [IV_SOURCE]: fixture("ml-indiosverdes-listing.html") });

    await expect(scrapeMercadoLibre(ivStore(), { fetchFn, delayFn: noDelay })).rejects.toThrow(
      /collected 48 of 58/,
    );
  });

  it("fetches with the Googlebot user agent instead of the browser one", async () => {
    const fetchFn = vi.fn(makeFetch({ [IV_SOURCE]: fixture("ml-indiosverdes-listing.html") }));

    await expect(scrapeMercadoLibre(ivStore(), { fetchFn, delayFn: noDelay })).rejects.toThrow();

    expect(fetchFn).toHaveBeenCalledWith(
      IV_SOURCE,
      expect.objectContaining({
        headers: expect.objectContaining({ "User-Agent": GOOGLEBOT_UA }),
      }),
    );
  });
});

describe("scrapeMercadoLibre page-miss diagnostics", () => {
  const wallHtml = `<!DOCTYPE html><html><head><title>Iniciar sesión — MercadoLibre</title></head><body><p>Para continuar, ingresa a tu cuenta.</p></body></html>`;

  it("throws with page diagnostics when the root has no cards and no total", async () => {
    const fetchFn = makeFetch({ [IV_SOURCE]: wallHtml });

    await expect(scrapeMercadoLibre(ivStore(), { fetchFn, delayFn: noDelay })).rejects.toThrow(
      /unusable page for "indiosverdes".*wall=true.*rows=0.*total=null/,
    );
  });

  it("throws even without coverage expectation when nothing parses", async () => {
    const fetchFn = makeFetch({ [DRUPA_SOURCE]: wallHtml });

    await expect(scrapeMercadoLibre(drupaStore(), { fetchFn, delayFn: noDelay })).rejects.toThrow(
      /unusable page for "drupa"/,
    );
  });

  it("throws when a coverage store loses the resultados count despite cards", async () => {
    const noTotal = fixture("ml-indiosverdes-listing.html").replace(/[\d.]+\s*resultados?/, "");
    const fetchFn = makeFetch({ [IV_SOURCE]: noTotal });

    await expect(scrapeMercadoLibre(ivStore(), { fetchFn, delayFn: noDelay })).rejects.toThrow(
      /unusable page for "indiosverdes".*total=null/,
    );
  });
});

describe("scrapeMercadoLibre www fallback", () => {
  const wallHtml = `<!DOCTYPE html><html><head><title>Iniciar sesión — MercadoLibre</title></head><body><p>Para continuar, ingresa a tu cuenta.</p></body></html>`;

  it("serves the www store page when the listado source is walled", async () => {
    const fetchFn = makeFetch({
      [IV_SOURCE]: wallHtml,
      [IV_WWW]: fixture("ml-indiosverdes-www.html"),
    });

    const rows = await scrapeMercadoLibre(ivStore(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(20);
    expect(new Set(rows.map((row) => row.external_id)).size).toBe(20);
    expect(rows.every((row) => row.store === "indiosverdes")).toBe(true);
    expect(rows.every((row) => row.price > 0)).toBe(true);
  });

  it("throws with a fallback note when the fallback page is also unusable", async () => {
    const fetchFn = makeFetch({ [IV_SOURCE]: wallHtml, [IV_WWW]: wallHtml });

    await expect(scrapeMercadoLibre(ivStore(), { fetchFn, delayFn: noDelay })).rejects.toThrow(
      /unusable page.*fallback/,
    );
  });

  it("never falls back when the primary only misses coverage", async () => {
    const fetchFn = vi.fn(
      makeFetch({
        [IV_SOURCE]: fixture("ml-indiosverdes-listing.html"),
        [IV_WWW]: fixture("ml-indiosverdes-www.html"),
      }),
    );

    await expect(scrapeMercadoLibre(ivStore(), { fetchFn, delayFn: noDelay })).rejects.toThrow(
      /collected 48 of 58/,
    );
    expect(fetchFn).not.toHaveBeenCalledWith(IV_WWW, expect.anything());
  });
});

describe("scrapeMercadoLibre drupa", () => {
  it("drops non-coffee junk and carousel repeats", async () => {
    const fetchFn = makeFetch({ [DRUPA_SOURCE]: fixture("ml-drupa-pagina.html") });

    const rows = await scrapeMercadoLibre(drupaStore(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(19);
    expect(new Set(rows.map((row) => row.external_id)).size).toBe(19);
    const names = rows.map((row) => row.name).join(" | ");
    expect(names).not.toMatch(/almendras/i);
    expect(names).not.toMatch(/inti zen/i);
    expect(names).not.toMatch(/cremuccino/i);
    expect(names).toMatch(/Cápsulas/);
    expect(rows.every((row) => row.store === "drupa")).toBe(true);
  });
});

function mlCard(shipping: string, installments = ""): string {
  return `
    <div class="andes-card poly-card">
      <a href="https://www.mercadolibre.com.ar/cafe-prueba-250-g/p/MLA1?wid=MLA111111" class="poly-component__title">Café Prueba 250 g</a>
      <div class="poly-component__price">
        <div class="poly-price__current"><span aria-label="10000 pesos argentinos"></span></div>
      </div>
      ${shipping}
      ${installments}
    </div>`;
}

const V2_SHIPPING_FREE = `<div class="poly-component__shipping-v2"><div class="poly-shipping-v2__item"><span><span class="polylabel-pill">Llega gratis mañana</span></span></div></div>`;
const V2_SHIPPING_PAID = `<div class="poly-component__shipping-v2"><div class="poly-shipping-v2__item"><span><span class="polylabel-pill">Llega por $2.500</span></span></div></div>`;

describe("parseMlCards shipping and installments", () => {
  it("reads free shipping and its note from the indiosverdes card pill", () => {
    const rows = parseMlCards(fixture("ml-indiosverdes-listing.html"), ivStore());

    expect(rows).toHaveLength(48);
    expect(rows.every((row) => row.free_shipping === true)).toBe(true);
    expect(rows.every((row) => row.shipping_note === "Llega gratis el lunes")).toBe(true);
  });

  it("marks free shipping only on the cards whose text says gratis", () => {
    const rows = parseMlCards(fixture("ml-drupa-pagina.html"), drupaStore());
    const free = rows.filter((row) => row.free_shipping === true);
    const unknown = rows.filter((row) => row.free_shipping === null);

    expect(free).toHaveLength(27);
    expect(free.every((row) => row.shipping_note === "Llega gratis el lunes")).toBe(true);
    expect(unknown).toHaveLength(3);
    expect(unknown.every((row) => row.shipping_note === null)).toBe(true);
  });

  it("flags a card that quotes a paid shipping price", () => {
    const rows = parseMlCards(mlCard(V2_SHIPPING_PAID), ivStore());

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      free_shipping: false,
      shipping_note: "Llega por $2.500",
    });
  });

  it("reads the legacy poly-shipping class with an underscored modifier", () => {
    const rows = parseMlCards(
      mlCard(`<div class="poly-component__shipping"><span class="poly-shipping--next_day">Llega gratis mañana</span></div>`),
      drupaStore(),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      free_shipping: true,
      shipping_note: "Llega gratis mañana",
    });
  });

  it("leaves shipping null when the card carries no shipping statement", () => {
    const rows = parseMlCards(mlCard("<div>Sin envío</div>"), ivStore());

    expect(rows[0]).toMatchObject({ free_shipping: null, shipping_note: null });
  });

  it("keeps installments null when the cards only advertise interest-bearing plans", () => {
    const iv = parseMlCards(fixture("ml-indiosverdes-listing.html"), ivStore());
    const drupa = parseMlCards(fixture("ml-drupa-pagina.html"), drupaStore());

    expect(iv.every((row) => row.installments === null)).toBe(true);
    expect(drupa.every((row) => row.installments === null)).toBe(true);
  });

  it("reads the installment count when the card states the plan is interest-free", () => {
    const rows = parseMlCards(
      mlCard(
        V2_SHIPPING_FREE,
        `<span class="poly-price__installments">6 cuotas de $1.666 sin interés</span>`,
      ),
      ivStore(),
    );

    expect(rows[0].installments).toBe("6 cuotas sin interés");
  });

  it("ignores an installment line without a parseable count", () => {
    const rows = parseMlCards(
      mlCard(V2_SHIPPING_FREE, `<span class="poly-price__installments">sin interés</span>`),
      ivStore(),
    );

    expect(rows[0].installments).toBeNull();
  });
});
