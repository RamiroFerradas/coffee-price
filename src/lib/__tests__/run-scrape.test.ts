import { afterEach, describe, expect, it, vi } from "vitest";
import { runScrape } from "@/lib/run-scrape";
import type { RawProduct, StoreId } from "@/lib/types";
import { createFakeDb } from "./fake-db";

const NOW = new Date("2026-01-15T12:00:00.000Z");

function isoMinutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

const FRESH = isoMinutesAgo(5);

function freshRows(except: Partial<Record<StoreId, number>> = {}) {
  const ids: StoreId[] = [
    "cafedelirante",
    "flatnwhite",
    "indigoroasters",
    "momotostadores",
    "bunatostadores",
    "fuegotostadores",
    "modobarista",
    "kapselmaker",
    "johnandjoe",
    "indiosverdes",
    "drupa",
  ];
  return ids.map((store) => ({
    store,
    fetched_at: except[store] !== undefined ? isoMinutesAgo(except[store]!) : FRESH,
  }));
}

function rawProduct(externalId: string, store: StoreId): RawProduct {
  return {
    store,
    external_id: externalId,
    name: `Colombia ${externalId} 250g`,
    url: `https://example.com/${externalId}`,
    roaster: "Roaster",
    price: 10000,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("runScrape", () => {
  it("skips every store that is not due and leaves the cache alone", async () => {
    const fake = createFakeDb({ selectData: freshRows() });
    const scrape = vi.fn(async (id: StoreId) => [rawProduct("p1", id)]);
    const onSynced = vi.fn();

    const result = await runScrape({ now: NOW, db: fake.db, scrape, onSynced });

    expect(scrape).not.toHaveBeenCalled();
    expect(result.reports).toHaveLength(11);
    expect(result.reports.every((r) => r.skipped === true && r.ok === false)).toBe(true);
    expect(result.totalProducts).toBe(0);
    expect(result.syncRan).toBe(false);
    expect(onSynced).not.toHaveBeenCalled();
  });

  it("scrapes, enriches and syncs a store whose refresh window elapsed", async () => {
    const fake = createFakeDb({
      selectData: freshRows({ cafedelirante: 60 }),
    });
    const scrape = vi.fn(async (id: StoreId) => [rawProduct("p1", id)]);
    const onSynced = vi.fn();

    const result = await runScrape({ now: NOW, db: fake.db, scrape, onSynced });

    expect(scrape).toHaveBeenCalledTimes(1);
    expect(scrape).toHaveBeenCalledWith("cafedelirante");
    const report = result.reports.find((r) => r.store === "cafedelirante");
    expect(report).toMatchObject({ ok: true, count: 1 });
    expect(report?.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.reports.filter((r) => r.skipped)).toHaveLength(10);
    expect(result.totalProducts).toBe(1);
    expect(result.syncRan).toBe(true);
    expect(onSynced).toHaveBeenCalledTimes(1);

    const rows = fake.upserts[0].rows as Record<string, unknown>[];
    expect(rows[0]).toMatchObject({
      fetched_at: NOW.toISOString(),
      origin: "Colombia",
      external_id: "p1",
    });
  });

  it("forces an explicitly requested store without reading due state", async () => {
    const fake = createFakeDb({ selectData: freshRows({ bunatostadores: 5 }) });
    const scrape = vi.fn(async (id: StoreId) => [rawProduct("p1", id)]);
    const onSynced = vi.fn();

    const result = await runScrape({
      stores: ["bunatostadores"],
      now: NOW,
      db: fake.db,
      scrape,
      onSynced,
    });

    expect(fake.selects).toHaveLength(0);
    expect(scrape).toHaveBeenCalledTimes(1);
    expect(scrape).toHaveBeenCalledWith("bunatostadores");
    expect(result.reports).toHaveLength(1);
    expect(result.reports[0]).toMatchObject({ store: "bunatostadores", ok: true, count: 1 });
    expect(result.syncRan).toBe(true);
    expect(onSynced).toHaveBeenCalledTimes(1);
  });

  it("isolates a failing store so the remaining stores still sync", async () => {
    const fake = createFakeDb({
      selectData: freshRows({ cafedelirante: 60, indigoroasters: 90 }),
    });
    const scrape = vi.fn(async (id: StoreId) => {
      if (id === "cafedelirante") throw new Error("HTTP 500 from listing");
      return [rawProduct(`p-${id}`, id)];
    });
    const onSynced = vi.fn();

    const result = await runScrape({ now: NOW, db: fake.db, scrape, onSynced });

    expect(scrape).toHaveBeenCalledTimes(2);
    const failed = result.reports.find((r) => r.store === "cafedelirante");
    expect(failed).toMatchObject({ ok: false, error: "HTTP 500 from listing" });
    expect(failed?.skipped).toBeUndefined();
    const synced = result.reports.find((r) => r.store === "indigoroasters");
    expect(synced).toMatchObject({ ok: true, count: 1 });
    expect(result.totalProducts).toBe(1);
    expect(result.syncRan).toBe(true);
    expect(onSynced).toHaveBeenCalledTimes(1);
  });

  it("reports a failed sync as ok:false and does not revalidate", async () => {
    const fake = createFakeDb({ upsertError: "row size limit exceeded" });
    const scrape = vi.fn(async (id: StoreId) => [rawProduct("p1", id)]);
    const onSynced = vi.fn();

    const result = await runScrape({
      stores: ["cafedelirante"],
      now: NOW,
      db: fake.db,
      scrape,
      onSynced,
    });

    expect(scrape).toHaveBeenCalledTimes(1);
    expect(result.reports[0].ok).toBe(false);
    expect(result.reports[0].error).toMatch(/Upsert failed.*row size limit exceeded/);
    expect(result.reports[0].count).toBeUndefined();
    expect(result.totalProducts).toBe(0);
    expect(result.syncRan).toBe(false);
    expect(onSynced).not.toHaveBeenCalled();
  });

  it("does not call onSynced when every attempted store fails", async () => {
    const fake = createFakeDb({
      selectData: freshRows({ cafedelirante: 60, indigoroasters: 90 }),
    });
    const scrape = vi.fn(async () => {
      throw new Error("network down");
    });
    const onSynced = vi.fn();

    const result = await runScrape({ now: NOW, db: fake.db, scrape, onSynced });

    expect(scrape).toHaveBeenCalledTimes(2);
    expect(result.reports.filter((r) => !r.skipped)).toHaveLength(2);
    expect(result.reports.every((r) => r.ok === false)).toBe(true);
    expect(result.syncRan).toBe(false);
    expect(onSynced).not.toHaveBeenCalled();
  });

  it("stops launching stores once the time budget is exhausted", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);

    const fake = createFakeDb({ selectData: [] });
    const scrape = vi.fn(async (id: StoreId) => {
      vi.setSystemTime(NOW.getTime() + 300_000);
      return [rawProduct("p1", id)];
    });
    const onSynced = vi.fn();

    const result = await runScrape({ now: NOW, db: fake.db, scrape, onSynced });

    expect(scrape).toHaveBeenCalledTimes(1);
    const [first, ...remaining] = result.reports;
    expect(first).toMatchObject({ ok: true, count: 1 });
    expect(remaining).toHaveLength(10);
    expect(
      remaining.every((r) => r.skipped === true && r.error === "budget-exceeded"),
    ).toBe(true);
    expect(result.totalProducts).toBe(1);
    expect(result.syncRan).toBe(true);
    expect(onSynced).toHaveBeenCalledTimes(1);
  });
});
