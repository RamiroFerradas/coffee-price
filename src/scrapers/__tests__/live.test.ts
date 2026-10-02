import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { StoreId } from "@/lib/types";
import { scrapeStore } from "../index";

const live = process.env.LIVE === "1";

const STORE_IDS: StoreId[] = [
  "cafedelirante",
  "flatnwhite",
  "indigoroasters",
  "momotostadores",
  "bunatostadores",
  "fuegotostadores",
];

describe.skipIf(!live)("live scrapers", () => {
  for (const id of STORE_IDS) {
    const minRows = id === "flatnwhite" ? 30 : 10;

    it(
      `scrapes ${id}`,
      async () => {
        const rows = await scrapeStore(id);

        expect(rows.length).toBeGreaterThanOrEqual(minRows);
        expect(rows.every((row) => row.store === id)).toBe(true);
        expect(rows.every((row) => row.price > 0)).toBe(true);
        expect(rows.every((row) => row.external_id.length > 0)).toBe(true);
        expect(new Set(rows.map((row) => row.external_id)).size).toBe(rows.length);

        const withGrams = rows.filter((row) => row.grams != null).length;
        expect(withGrams / rows.length).toBeGreaterThanOrEqual(0.7);
        expect(rows.every((row) => typeof row.url === "string" && row.url.length > 0)).toBe(true);

        const summary =
          `[live] ${id}: ${rows.length} rows, grams ${withGrams}/${rows.length} ` +
          `(${((withGrams / rows.length) * 100).toFixed(0)}%), ` +
          `price ${Math.min(...rows.map((r) => r.price))}-${Math.max(...rows.map((r) => r.price))} ARS`;
        console.log(summary);
        appendFileSync(new URL("../../../.vitest/live-summary.txt", import.meta.url), `${summary}\n`);
      },
      300_000,
    );
  }
});
