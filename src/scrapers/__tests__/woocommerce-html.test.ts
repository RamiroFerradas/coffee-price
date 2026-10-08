import { describe, expect, it, vi } from "vitest";
import { scrapeWooHtml } from "../woocommerce-html";
import { getStore, type WooHtmlStore } from "../stores";
import { fixture, makeFetch } from "./fixture";

const SITEMAP_URL = "https://flatnwhite.com/product-sitemap.xml";
const LISTING = "https://flatnwhite.com/cafe-de-especialidad-flatwhite-argentina/";
const ETIOPIA = "https://flatnwhite.com/cafe-especialidad-etiopia/";
const COLOMBIA = "https://flatnwhite.com/cafe-de-especialidad-colombia/";
const BURUNDI = "https://flatnwhite.com/cafe-especialidad-burundi/";
const RUANDA = "https://flatnwhite.com/cafe-especialidad-ruanda/";
const MARAX = "https://flatnwhite.com/lelit-marax/";

const COFFEE_URLS = [COLOMBIA, BURUNDI, ETIOPIA, RUANDA];

const config = () => getStore("flatnwhite") as WooHtmlStore;
const sitemapConfig = (): WooHtmlStore => ({
  ...(getStore("flatnwhite") as WooHtmlStore),
  discovery: { kind: "sitemap", sitemapUrl: SITEMAP_URL },
});
const noDelay = () => Promise.resolve();

function productUrls(): string[] {
  return [...fixture("flatnwhite-sitemap.xml").matchAll(/<url>[\s\S]*?<\/url>/g)]
    .map((block) => block[0].match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim() ?? "")
    .filter(Boolean)
    .filter((url) => !url.endsWith("/tienda/"));
}

describe("scrapeWooHtml", () => {
  it("discovers product urls from the sitemap without hitting wp-json or the shop page", async () => {
    const urls = productUrls();
    const fetchFn = vi.fn(
      makeFetch({
        [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
        ...Object.fromEntries(urls.map((url) => [url, fixture("flatnwhite-product-coffee.html")])),
      }),
    );
    await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });

    const called = fetchFn.mock.calls.map((call) => call[0]);
    expect(called[0]).toBe(SITEMAP_URL);
    expect(called.slice(1)).toEqual(urls);
    expect(called.some((url) => url.includes("/wp-json/"))).toBe(false);
    expect(called.some((url) => url.endsWith("/tienda/"))).toBe(false);
  });

  it("parses name, price, grams, image and slug from the product JSON-LD", async () => {
    const urls = productUrls();
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      ...Object.fromEntries(urls.map((url) => [url, fixture("flatnwhite-product-coffee.html")])),
    });
    const rows = await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(urls.length);
    const etiopia = rows.find((row) => row.external_id === "cafe-especialidad-etiopia");
    expect(etiopia).toMatchObject({
      store: "flatnwhite",
      roaster: "Flat & White",
      name: "Café de Especialidad Etiopía Yirgacheffe",
      url: ETIOPIA,
      price: 38000,
      grams: 250,
      in_stock: true,
      image_url: "https://flatnwhite.com/wp-content/uploads/2024/12/ETIQUETAS_1.1.png",
    });
    expect(rows.every((row) => row.price > 0)).toBe(true);
  });

  it("skips products priced in USD", async () => {
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [ETIOPIA]: fixture("flatnwhite-product-coffee.html"),
      [MARAX]: fixture("flatnwhite-product-equipment.html"),
    });
    const rows = await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0].external_id).toBe("cafe-especialidad-etiopia");
    expect(rows.some((row) => row.name.includes("MaraX"))).toBe(false);
  });

  it("uses lowPrice for AggregateOffer products", async () => {
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [COLOMBIA]: fixture("flatnwhite-product-aggregate.html"),
    });
    const rows = await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      external_id: "cafe-de-especialidad-colombia",
      price: 28000,
      grams: 250,
      in_stock: true,
    });
  });

  it("keeps the in_stock flag from offer availability", async () => {
    const outOfStock = fixture("flatnwhite-product-coffee.html").replaceAll(
      "http://schema.org/InStock",
      "http://schema.org/OutOfStock",
    );
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [ETIOPIA]: outOfStock,
    });
    const rows = await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0].in_stock).toBe(false);
    expect(rows[0].price).toBe(38000);
  });

  it("keeps the main product JSON-LD price when struck-through <del>/<ins> markup appears elsewhere", async () => {
    const struckRelatedWidget = [
      `<div class="related products"><ul class="products">`,
      `<li class="product"><a href="https://flatnwhite.com/lelit-flair-neo-flex/">`,
      `<span class="price"><del>Desde: <span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">$</span>460.000,00</bdi></span></del> `,
      `<ins>Desde: <span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">$</span>350.000,00</bdi></span></ins></span>`,
      `</a></li></ul></div>`,
    ].join("");
    const page = fixture("flatnwhite-product-coffee.html") + struckRelatedWidget;
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [ETIOPIA]: page,
    });
    const rows = await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      external_id: "cafe-especialidad-etiopia",
      price: 38000,
    });
  });

  it("skips pages without Product JSON-LD instead of failing the run", async () => {
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [ETIOPIA]: "<!DOCTYPE html><html><head><title>404</title></head></html>",
    });
    const rows = await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });
    expect(rows).toEqual([]);
  });

  it("rate-limits sequential page requests with the configured delay", async () => {
    const urls = productUrls();
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      ...Object.fromEntries(urls.map((url) => [url, fixture("flatnwhite-product-coffee.html")])),
    });
    const delayFn = vi.fn(noDelay);
    await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn });

    expect(delayFn).toHaveBeenCalledTimes(urls.length);
    expect(delayFn).toHaveBeenCalledWith(sitemapConfig().requestDelayMs);
  });
});

describe("scrapeWooHtml weight variations", () => {
  it("expands the weight axis into one row per weight with the first variation's price", async () => {
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [COLOMBIA]: fixture("flatnwhite-colombia-detail.html"),
    });
    const rows = await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.external_id)).size).toBe(2);

    const quarterKg = rows.find((row) => row.external_id === "cafe-de-especialidad-colombia-250");
    expect(quarterKg).toMatchObject({
      store: "flatnwhite",
      roaster: "Flat & White",
      name: "Café de Especialidad Colombia Tolima",
      url: COLOMBIA,
      price: 28000,
      grams: 250,
      in_stock: true,
    });

    const kilo = rows.find((row) => row.external_id === "cafe-de-especialidad-colombia-1000");
    expect(kilo).toMatchObject({
      url: COLOMBIA,
      price: 88000,
      grams: 1000,
      in_stock: true,
    });
  });

  it("keeps a single row for grind-only variations without a weight axis", async () => {
    const fetchFn = makeFetch({
      [LISTING]: fixture("flatnwhite-archive.html"),
      [BURUNDI]: fixture("flatnwhite-burundi-detail.html"),
    });
    const rows = await scrapeWooHtml(config(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      external_id: "cafe-especialidad-burundi",
      url: BURUNDI,
      price: 30000,
      grams: 250,
      in_stock: true,
    });
  });

  it("parses entity-encoded data-product_variations payloads", async () => {
    const payload = [
      {
        variation_id: 1,
        attributes: { attribute_pa_peso: "500-g" },
        display_price: 10000,
        weight: "0.5",
        is_in_stock: true,
        sku: "",
      },
      {
        variation_id: 2,
        attributes: { attribute_pa_peso: "2-kg" },
        display_price: 35000,
        weight: "2",
        is_in_stock: false,
        sku: "",
      },
    ];
    const encoded = JSON.stringify(payload).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
    const page = [
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "Café de Especialidad Ruanda",
        url: RUANDA,
        weight: { "@type": "QuantitativeValue", unitCode: "KGM", value: "0.5" },
        offers: {
          "@type": "Offer",
          priceCurrency: "ARS",
          price: "10000",
          availability: "http://schema.org/InStock",
          url: RUANDA,
        },
      })}</script>`,
      `<form class="variations_form cart" data-product_id="99" data-product_variations="${encoded}"></form>`,
    ].join("");
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [RUANDA]: page,
    });
    const rows = await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(2);
    expect(
      rows.find((row) => row.external_id === "cafe-especialidad-ruanda-500"),
    ).toMatchObject({ price: 10000, grams: 500, in_stock: true });
    expect(
      rows.find((row) => row.external_id === "cafe-especialidad-ruanda-2000"),
    ).toMatchObject({ price: 35000, grams: 2000, in_stock: false });
  });
});

describe("scrapeWooHtml coffee archive discovery", () => {
  it("requests the archive listing first and only then the four coffees it lists", async () => {
    const fetchFn = vi.fn(
      makeFetch({
        [LISTING]: fixture("flatnwhite-archive.html"),
        ...Object.fromEntries(
          COFFEE_URLS.map((url) => [url, fixture("flatnwhite-product-coffee.html")]),
        ),
      }),
    );
    const delayFn = vi.fn(noDelay);
    await scrapeWooHtml(config(), { fetchFn, delayFn });

    const called = fetchFn.mock.calls.map((call) => call[0]);
    expect(called[0]).toBe(LISTING);
    expect(called.slice(1)).toEqual(COFFEE_URLS);
    expect(called).toHaveLength(1 + COFFEE_URLS.length);
    expect(called.some((url) => url.includes("/wp-json/"))).toBe(false);
    expect(called.some((url) => url.includes("product-sitemap"))).toBe(false);
    expect(called.some((url) => url.includes("/cafeteras/") || url.includes("/tienda/"))).toBe(
      false,
    );
    // crawl-delay between every request, including listing -> first product page
    expect(delayFn).toHaveBeenCalledTimes(COFFEE_URLS.length);
    expect(delayFn).toHaveBeenCalledWith(config().requestDelayMs);
  });

  it("scrapes exactly the coffees in the archive through the existing PDP parsing", async () => {
    const fetchFn = makeFetch({
      [LISTING]: fixture("flatnwhite-archive.html"),
      [ETIOPIA]: fixture("flatnwhite-product-coffee.html"),
      [COLOMBIA]: fixture("flatnwhite-product-aggregate.html"),
      [BURUNDI]: fixture("flatnwhite-product-coffee.html"),
      [RUANDA]: fixture("flatnwhite-product-coffee.html"),
    });
    const rows = await scrapeWooHtml(config(), { fetchFn, delayFn: noDelay });

    expect(rows.map((row) => row.external_id).sort()).toEqual([
      "cafe-de-especialidad-colombia",
      "cafe-especialidad-burundi",
      "cafe-especialidad-etiopia",
      "cafe-especialidad-ruanda",
    ]);
    expect(rows.find((row) => row.external_id === "cafe-especialidad-etiopia")).toMatchObject({
      store: "flatnwhite",
      price: 38000,
      grams: 250,
      in_stock: true,
    });
    expect(rows.find((row) => row.external_id === "cafe-de-especialidad-colombia")?.price).toBe(
      28000,
    );
    expect(rows.every((row) => row.price > 0)).toBe(true);
  });
});

describe("scrapeWooHtml free-shipping threshold", () => {
  it("reads the threshold from the wayra shipping block on the detail page", async () => {
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [COLOMBIA]: fixture("flatnwhite-colombia-detail.html"),
    });
    const rows = await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.shipping_note === "Envío gratis desde $90.000")).toBe(true);
    expect(rows.every((row) => row.free_shipping === null)).toBe(true);
    expect(rows.every((row) => row.installments === null)).toBe(true);
  });

  it("leaves the shipping fields null when the detail page has no shipping block", async () => {
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [ETIOPIA]: fixture("flatnwhite-product-coffee.html"),
    });
    const rows = await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });

    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.every(
        (row) => row.shipping_note === null && row.free_shipping === null && row.installments === null,
      ),
    ).toBe(true);
  });
});

describe("scrapeWooHtml coffee specs", () => {
  it("reads score, roast, notes, process and altitude from the colombia detail table", async () => {
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [COLOMBIA]: fixture("flatnwhite-colombia-detail.html"),
    });
    const rows = await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).toMatchObject({
        score: 86,
        roast_level: "Medio",
        tasting_notes: "Chocolate con leche, caramelo, naranja",
        process: "Lavado",
        altitude: "1600 msnm",
      });
    }
  });

  it("reads the burundi detail table", async () => {
    const fetchFn = makeFetch({
      [LISTING]: fixture("flatnwhite-archive.html"),
      [BURUNDI]: fixture("flatnwhite-burundi-detail.html"),
    });
    const rows = await scrapeWooHtml(config(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      score: 88,
      roast_level: "Claro",
      tasting_notes: "Naranja con chocolate, higo, cacao nibs y melaza",
      process: "Natural en camas africanas",
      altitude: "1750 msnm",
    });
  });

  it("falls back to the JSON-LD description when the page has no table or meta", async () => {
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [ETIOPIA]: fixture("flatnwhite-product-coffee.html"),
    });
    const rows = await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      score: 90,
      tasting_notes: "Franui, zarzamora y jazmín",
      process: null,
      roast_level: null,
      altitude: null,
    });
  });

  it("falls back to the meta description and short description prose when the table is missing", async () => {
    const page = [
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "Café de Especialidad Sintético",
        url: RUANDA,
        offers: {
          priceCurrency: "ARS",
          price: "10000",
          availability: "http://schema.org/InStock",
          url: RUANDA,
        },
      })}</script>`,
      '<meta name="description" content="Puntaje 87. Notas de chocolate semiamargo. Envíos a todo el país." />',
      `<div class="woocommerce-product-details__short-description"><p>Café de especialidad, proceso natural en camas, 1650 msnm. Disponible en grano o molido.</p></div>`,
    ].join("");
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [RUANDA]: page,
    });
    const rows = await scrapeWooHtml(sitemapConfig(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      score: 87,
      tasting_notes: "chocolate semiamargo",
      process: "Natural",
      altitude: "1650 msnm",
      roast_level: null,
    });
  });
});
