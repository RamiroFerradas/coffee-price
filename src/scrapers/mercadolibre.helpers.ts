import { parseArsPrice, parseGrams } from "@/lib/normalize";
import type { RawProduct } from "@/lib/types";
import { decodeEntities } from "./ldjson";
import type { MercadoLibreStore } from "./stores";

export const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const CARD_SPLIT = '<div class="andes-card poly-card';

export function parseMlTotal(html: string): number | null {
  const match = /([\d.]+)\s*resultados?\b/.exec(html);
  if (!match) return null;
  const value = Number(match[1].replace(/\./g, ""));
  return Number.isFinite(value) ? value : null;
}

function idFromText(text: string): string | null {
  const wid = /[?&]wid=(MLA\d+)/.exec(text);
  if (wid) return wid[1];
  const article = /articulo\.mercadolibre\.com\.ar\/MLA-(\d+)/.exec(text);
  if (article) return `MLA${article[1]}`;
  const catalog = /\/p\/(MLA\d+)/.exec(text);
  if (catalog) return catalog[1];
  const up = /\/up\/(MLA\w+)/.exec(text);
  if (up) return up[1];
  return null;
}

function cardExternalId(segment: string): string | null {
  const titleHref = /<a\b[^>]*href="([^"]+)"[^>]*class="poly-component__title"/.exec(segment);
  if (titleHref) {
    const fromTitle = idFromText(decodeEntities(titleHref[1]));
    if (fromTitle) return fromTitle;
  }
  return idFromText(decodeEntities(segment));
}

function parseMlPrice(segment: string): number | null {
  const start = segment.indexOf('<div class="poly-price__current">');
  if (start < 0) return null;
  const close = segment.indexOf("</div>", start);
  const block = segment.slice(start, close < 0 ? segment.length : close);
  const current = /aria-label="(?:Ahora:\s*)?(\d[\d.]*)\s*pesos argentinos"/.exec(block);
  if (current) return parseArsPrice(current[1]);
  const amount = /class="[^"]*poly-price__amount[^"]*"[^>]*aria-label="(?:Ahora:\s*)?(\d[\d.]*)\s*pesos argentinos"/.exec(
    segment,
  );
  if (amount) return parseArsPrice(amount[1]);
  return null;
}

const PAID_SHIPPING = /llega\s+por\s*\$[\d.]+|\benv[ií]o\s*(?:cuesta\s*)?\$[\d.]+/i;

function cardShipping(segment: string): { free_shipping: boolean | null; shipping_note: string | null } {
  const v2 = /poly-shipping-v2__item">([\s\S]*?)<\/(?:span|div)>/.exec(segment);
  const v1 = /poly-shipping--[^"]+">([\s\S]*?)<\/span>/.exec(segment);
  const match = v2 ?? v1;
  const text = match
    ? decodeEntities(match[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim()
    : "";
  if (!text) return { free_shipping: null, shipping_note: null };
  if (/gratis/i.test(text)) return { free_shipping: true, shipping_note: text };
  if (PAID_SHIPPING.test(text)) return { free_shipping: false, shipping_note: text };
  return { free_shipping: null, shipping_note: null };
}

function cardInstallments(segment: string): string | null {
  const start = segment.indexOf("poly-price__installments");
  if (start < 0) return null;
  const ends = [segment.indexOf("poly-component__", start), segment.indexOf("poly-shipping", start)]
    .filter((index) => index > start);
  const end = ends.length > 0 ? Math.min(...ends) : Math.min(segment.length, start + 400);
  const text = decodeEntities(segment.slice(start, end).replace(/<[^>]+>/g, " "));
  if (!/sin\s+inter[eé]s/i.test(text)) return null;
  const count = /(\d+)\s*cuotas/i.exec(text)?.[1];
  return count ? `${count} cuotas sin interés` : null;
}

function parseCard(segment: string, config: MercadoLibreStore): RawProduct | null {
  const externalId = cardExternalId(segment);
  if (!externalId) return null;

  const titleTag = /<a\b[^>]*class="poly-component__title"[^>]*>([\s\S]*?)<\/a>/.exec(segment);
  if (!titleTag) return null;
  const name = decodeEntities(titleTag[1].replace(/<[^>]+>/g, "")).trim().normalize("NFC");
  if (!name) return null;

  const hrefTag = /<a\b[^>]*href="([^"]+)"[^>]*class="poly-component__title"/.exec(segment);
  if (!hrefTag) return null;
  const url = decodeEntities(hrefTag[1]).split(/[?#]/)[0];

  const price = parseMlPrice(segment);
  if (price == null || price <= 0) return null;

  const image = /<img[^>]*\bsrc="([^"]+)"/.exec(segment);
  const inStock = !/\bsin\s+stock\b|\bagotad[oa]\b|\bsold\s+out\b/i.test(decodeEntities(segment));
  const shipping = cardShipping(segment);

  return {
    store: config.id,
    external_id: externalId,
    name,
    url,
    roaster: config.roaster,
    price,
    image_url: image ? decodeEntities(image[1]) : null,
    grams: parseGrams(name),
    in_stock: inStock,
    free_shipping: shipping.free_shipping,
    shipping_note: shipping.shipping_note,
    installments: cardInstallments(segment),
  };
}

export function parseMlCards(html: string, config: MercadoLibreStore): RawProduct[] {
  const rows: RawProduct[] = [];
  for (const segment of html.split(CARD_SPLIT).slice(1)) {
    const row = parseCard(segment, config);
    if (row) rows.push(row);
  }
  return rows;
}

export function extractMlFacetLinks(html: string, source: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(
    /<a\b[^>]*href="(https:\/\/listado\.mercadolibre\.com\.ar\/[^"]+)"/g,
  )) {
    const clean = decodeEntities(match[1]).split(/[?#]/)[0];
    if (!clean.startsWith(source)) continue;
    const tail = clean.slice(source.length);
    if (!tail) continue;
    if (!/\/cafe\//.test(clean) && !tail.includes("_")) continue;
    if (seen.has(clean)) continue;
    seen.add(clean);
    links.push(clean);
  }
  return links;
}

export function pageMiss(
  config: MercadoLibreStore,
  html: string,
  rows: number,
  total: number | null,
  note?: string,
): Error {
  const wall = /account-verification|para continuar, ingresa/i.test(html);
  const title =
    /<title[^>]*>([\s\S]*?)<\/title>/.exec(html)?.[1]?.trim().slice(0, 80) ?? "";
  return new Error(
    `MercadoLibre unusable page for "${config.id}": len=${html.length} wall=${wall} rows=${rows} total=${total ?? "null"} title="${title}"${note ? ` ${note}` : ""}`,
  );
}
