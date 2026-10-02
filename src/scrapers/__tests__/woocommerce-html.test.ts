import { describe, expect, it, vi } from "vitest";
import { scrapeWooHtml } from "../woocommerce-html";
import { getStore, type WooHtmlStore } from "../stores";
import { fixture, makeFetch } from "./fixture";

const SITEMAP_URL = "https://flatnwhite.com/product-sitemap.xml";
const ETIOPIA = "https://flatnwhite.com/cafe-especialidad-etiopia/";
const COLOMBIA = "https://flatnwhite.com/cafe-de-especialidad-colombia/";
const MARAX = "https://flatnwhite.com/lelit-marax/";

const config = () => getStore("flatnwhite") as WooHtmlStore;
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
    await scrapeWooHtml(config(), { fetchFn, delayFn: noDelay });

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
    const rows = await scrapeWooHtml(config(), { fetchFn, delayFn: noDelay });

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
    const rows = await scrapeWooHtml(config(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0].external_id).toBe("cafe-especialidad-etiopia");
    expect(rows.some((row) => row.name.includes("MaraX"))).toBe(false);
  });

  it("uses lowPrice for AggregateOffer products", async () => {
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [COLOMBIA]: fixture("flatnwhite-product-aggregate.html"),
    });
    const rows = await scrapeWooHtml(config(), { fetchFn, delayFn: noDelay });

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
    const rows = await scrapeWooHtml(config(), { fetchFn, delayFn: noDelay });

    expect(rows).toHaveLength(1);
    expect(rows[0].in_stock).toBe(false);
    expect(rows[0].price).toBe(38000);
  });

  it("skips pages without Product JSON-LD instead of failing the run", async () => {
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      [ETIOPIA]: "<!DOCTYPE html><html><head><title>404</title></head></html>",
    });
    const rows = await scrapeWooHtml(config(), { fetchFn, delayFn: noDelay });
    expect(rows).toEqual([]);
  });

  it("rate-limits sequential page requests with the configured delay", async () => {
    const urls = productUrls();
    const fetchFn = makeFetch({
      [SITEMAP_URL]: fixture("flatnwhite-sitemap.xml"),
      ...Object.fromEntries(urls.map((url) => [url, fixture("flatnwhite-product-coffee.html")])),
    });
    const delayFn = vi.fn(noDelay);
    await scrapeWooHtml(config(), { fetchFn, delayFn });

    expect(delayFn).toHaveBeenCalledTimes(urls.length - 1);
    expect(delayFn).toHaveBeenCalledWith(config().requestDelayMs);
  });
});
