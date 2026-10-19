import type { RawProduct } from "@/lib/types";
import { delay, fetchText } from "./http";
import { collectProducts, dedupeByExternalId, extractLdJsonBlocks } from "./ldjson";
import type { WooHtmlStore } from "./stores";
import {
  expandWeightRows,
  parseSitemap,
  toRow,
  urlsFromArchive,
} from "./woocommerce-html.helpers";
import type { WooHtmlScrapeDeps } from "./woocommerce-html.types";

export type { WooHtmlScrapeDeps, WooVariation } from "./woocommerce-html.types";

export async function scrapeWooHtml(
  config: WooHtmlStore,
  deps: WooHtmlScrapeDeps = {},
): Promise<RawProduct[]> {
  const { fetchFn, delayFn = delay } = deps;

  // robots.txt asks for a crawl delay between every request, including the
  // discovery page -> first product page gap.
  let requests = 0;
  const pacedFetch = async (url: string): Promise<string> => {
    if (requests > 0) await delayFn(config.requestDelayMs);
    requests += 1;
    return fetchText(url, { fetchFn });
  };

  let urls: string[];
  if (config.discovery.kind === "archive") {
    urls = urlsFromArchive(await pacedFetch(config.discovery.listingUrl), config.baseUrl);
  } else {
    const sitemap = await pacedFetch(config.discovery.sitemapUrl);
    urls = parseSitemap(sitemap).filter((url) => !url.endsWith("/tienda/"));
  }

  const rows: RawProduct[] = [];
  for (const url of urls) {
    try {
      const html = await pacedFetch(url);
      const [product] = collectProducts(extractLdJsonBlocks(html));
      if (!product) continue;
      const row = toRow(config, product, url, html);
      if (row) rows.push(...(expandWeightRows(row, html) ?? [row]));
    } catch {
      continue;
    }
  }
  return dedupeByExternalId(rows);
}
