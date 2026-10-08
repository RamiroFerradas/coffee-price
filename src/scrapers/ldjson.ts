import type { RawProduct } from "@/lib/types";

export interface LdOffer {
  price?: string | number;
  lowPrice?: string | number;
  priceCurrency?: string;
  availability?: string;
  url?: string;
  priceSpecification?: { price?: string | number };
}

export interface LdProduct {
  "@type"?: string | string[];
  name?: string;
  sku?: string;
  url?: string;
  "@id"?: string;
  image?: unknown;
  weight?: unknown;
  offers?: LdOffer | LdOffer[];
  mainEntityOfPage?: { "@id"?: string } | string;
  category?: string;
  [key: string]: unknown;
}

const LD_JSON_BLOCK = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

export function extractLdJsonBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  for (const match of html.matchAll(LD_JSON_BLOCK)) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // Tiendanube themes occasionally emit non-JSON script bodies; ignore them.
    }
  }
  return blocks;
}

function isProductType(type: unknown): boolean {
  if (typeof type === "string") return type === "Product";
  if (Array.isArray(type)) return type.some((t) => t === "Product");
  return false;
}

export function collectProducts(blocks: unknown[]): LdProduct[] {
  const products: LdProduct[] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (Array.isArray(record["@graph"])) record["@graph"].forEach(visit);
    if (record["@type"] === "ItemList" && Array.isArray(record.itemListElement)) {
      for (const entry of record.itemListElement as unknown[]) {
        if (entry && typeof entry === "object" && "item" in entry) {
          visit((entry as { item: unknown }).item);
        }
      }
    }
    if (isProductType(record["@type"])) products.push(record as LdProduct);
  };
  blocks.forEach(visit);
  return products;
}

export function productUrl(product: LdProduct): string | null {
  if (typeof product.url === "string" && product.url) return product.url;
  const mep = product.mainEntityOfPage;
  if (typeof mep === "string" && mep) return mep;
  if (mep && typeof mep === "object" && mep["@id"]) return mep["@id"];
  return null;
}

export function gramsFromWeight(weight: unknown): number | null {
  if (!weight || typeof weight !== "object") return null;
  const { unitCode, value } = weight as { unitCode?: unknown; value?: unknown };
  const numeric = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const code = String(unitCode ?? "").toUpperCase();
  if (code === "KGM") return Math.round(numeric * 1000);
  if (code === "GRM" || code === "G91") return Math.round(numeric);
  return null;
}

export function inStockFromAvailability(availability: unknown): boolean {
  if (typeof availability !== "string" || availability.length === 0) return true;
  if (availability.includes("OutOfStock")) return false;
  return true;
}

export function absoluteUrl(url: unknown, baseUrl: string): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return null;
  }
}

export function firstImageUrl(image: unknown, baseUrl?: string): string | null {
  const candidates: unknown[] = Array.isArray(image) ? image : [image];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const resolved = absoluteUrl(candidate, baseUrl ?? candidate);
      if (resolved) return resolved;
    } else if (candidate && typeof candidate === "object") {
      const url = (candidate as { url?: unknown }).url;
      const resolved = absoluteUrl(url, baseUrl ?? "");
      if (resolved) return resolved;
    }
  }
  return null;
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

export function slugFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? "";
  } catch {
    return "";
  }
}

export function dedupeByExternalId(products: RawProduct[]): RawProduct[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.external_id)) return false;
    seen.add(product.external_id);
    return true;
  });
}
