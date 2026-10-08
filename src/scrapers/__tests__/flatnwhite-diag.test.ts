import { describe, expect, it } from "vitest";
import { writeArtifact } from "@/lib/artifact";
import { scrapeStore } from "../index";

const INT_MAX = 2_147_483_647;

describe.runIf(process.env.LIVE === "1")("flatnwhite overflow diagnosis", () => {
  it("reports rows that overflow int4 arithmetic", async () => {
    const raw = await scrapeStore("flatnwhite");
    const columnOverflow = raw.filter((p) => p.price > INT_MAX);
    const oldExprOverflow = raw.filter(
      (p) => p.grams != null && p.grams > 0 && p.price * 1000 > INT_MAX,
    );
    const newExprOverflow = raw.filter(
      (p) =>
        p.grams != null &&
        p.grams > 0 &&
        Math.trunc((p.price * 1000) / p.grams) > INT_MAX,
    );
    const summarize = (rows: typeof raw) =>
      rows.map((p) => ({ name: p.name, price: p.price, grams: p.grams }));
    const report = {
      total: raw.length,
      columnOverflow: summarize(columnOverflow),
      oldExprOverflow: summarize(oldExprOverflow),
      newExprOverflow: summarize(newExprOverflow),
      rows: raw.map((p) => ({
        name: p.name,
        price: p.price,
        grams: p.grams,
      })),
    };
    writeArtifact(
      "scripts/out/flatnwhite-diag.json",
      JSON.stringify(report, null, 2),
    );
    console.log(
      `total=${report.total} column=${report.columnOverflow.length} old=${report.oldExprOverflow.length} new=${report.newExprOverflow.length}`,
    );
    expect(raw.length).toBeGreaterThan(0);
  }, 240_000);
});
