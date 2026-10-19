import type { RawProduct } from "@/lib/types";
import { isNonCoffee } from "./enrich";
import { dedupeByExternalId } from "./ldjson";
import { delay, fetchText } from "./http";
import type { MercadoLibreStore } from "./stores";
import {
  GOOGLEBOT_UA,
  extractMlFacetLinks,
  pageMiss,
  parseMlCards,
  parseMlTotal,
} from "./mercadolibre.helpers";
import type { MercadoLibreScrapeDeps } from "./mercadolibre.types";

export { GOOGLEBOT_UA, extractMlFacetLinks, parseMlCards, parseMlTotal } from "./mercadolibre.helpers";
export type { MercadoLibreScrapeDeps } from "./mercadolibre.types";

export async function scrapeMercadoLibre(
  config: MercadoLibreStore,
  deps: MercadoLibreScrapeDeps = {},
): Promise<RawProduct[]> {
  const { fetchFn, delayFn = delay } = deps;
  const headers = { "User-Agent": GOOGLEBOT_UA };
  let requested = false;
  const pace = async (): Promise<void> => {
    if (requested) await delayFn(config.requestDelayMs);
    requested = true;
  };

  await pace();
  const rootHtml = await fetchText(config.source, { fetchFn, headers });
  const rows = parseMlCards(rootHtml, config);
  const total = parseMlTotal(rootHtml);

  const rejected =
    (rows.length === 0 && total == null) || (config.expectCoverage && total == null);
  if (rejected) {
    const fallbackUrl = config.fallbackSource;
    if (!fallbackUrl) throw pageMiss(config, rootHtml, rows.length, total);
    await pace();
    let fallbackHtml: string;
    try {
      fallbackHtml = await fetchText(fallbackUrl, { fetchFn, headers });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw pageMiss(
        config,
        rootHtml,
        rows.length,
        total,
        `fallback="${fallbackUrl}" fetch failed: ${reason}`,
      );
    }
    const fallbackRows = parseMlCards(fallbackHtml, config);
    if (fallbackRows.length === 0) {
      throw pageMiss(config, fallbackHtml, 0, null, `fallback="${fallbackUrl}"`);
    }
    return dedupeByExternalId(fallbackRows).filter((row) => !isNonCoffee(row.name));
  }

  if (total != null) {
    const queue = extractMlFacetLinks(rootHtml, config.source);
    let index = 0;
    const collected = new Set(rows.map((row) => row.external_id));
    while (collected.size < total && index < queue.length) {
      const url = queue[index++];
      await pace();
      let html: string;
      try {
        html = await fetchText(url, { fetchFn, headers });
      } catch {
        continue;
      }
      const facetRows = parseMlCards(html, config);
      for (const row of facetRows) {
        if (!collected.has(row.external_id)) {
          collected.add(row.external_id);
          rows.push(row);
        }
      }
    }
    if (collected.size < total) {
      throw new Error(
        `MercadoLibre coverage shortfall for "${config.id}": collected ${collected.size} of ${total} items`,
      );
    }
  }

  const deduped = dedupeByExternalId(rows);
  return deduped.filter((row) => !isNonCoffee(row.name));
}
