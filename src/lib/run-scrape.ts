import { dueStores } from "@/lib/refresh";
import { getLastSynced, syncStore, type SupabaseLike } from "@/lib/persistence";
import type { StoreId } from "@/lib/types";
import { enrich } from "@/scrapers/enrich";
import { scrapeStore } from "@/scrapers/index";
import { STORES } from "@/scrapers/stores";

export interface ScrapeReport {
  store: StoreId;
  ok: boolean;
  count?: number;
  skipped?: boolean;
  durationMs?: number;
  error?: string;
}

export interface RunScrapeOptions {
  stores?: StoreId[];
  now?: Date;
  db: SupabaseLike;
  scrape?: typeof scrapeStore;
  onSynced?: () => void;
}

export interface ScrapeRunResult {
  reports: ScrapeReport[];
  totalProducts: number;
  syncRan: boolean;
}

const BUDGET_MS = 250_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runScrape(opts: RunScrapeOptions): Promise<ScrapeRunResult> {
  const now = opts.now ?? new Date();
  const scrape = opts.scrape ?? scrapeStore;
  const startedAt = Date.now();

  let targets: { store: StoreId; due: boolean }[];
  if (opts.stores !== undefined) {
    targets = opts.stores.map((store) => ({ store, due: true }));
  } else {
    const lastSynced = await getLastSynced(opts.db);
    const dueIds = new Set(dueStores(now, lastSynced).map((store) => store.id));
    targets = STORES.map((store) => ({ store: store.id, due: dueIds.has(store.id) }));
  }

  const reports: ScrapeReport[] = [];
  let totalProducts = 0;
  let syncedStores = 0;

  for (const target of targets) {
    if (!target.due) {
      reports.push({ store: target.store, ok: false, skipped: true });
      continue;
    }
    if (Date.now() - startedAt > BUDGET_MS) {
      reports.push({
        store: target.store,
        ok: false,
        skipped: true,
        error: "budget-exceeded",
      });
      continue;
    }

    const storeStartedAt = Date.now();
    try {
      const raw = await scrape(target.store);
      const enriched = raw.map(enrich);
      const { inserted } = await syncStore(target.store, enriched, now, opts.db);
      totalProducts += inserted;
      syncedStores += 1;
      reports.push({
        store: target.store,
        ok: true,
        count: inserted,
        durationMs: Date.now() - storeStartedAt,
      });
    } catch (error) {
      reports.push({
        store: target.store,
        ok: false,
        error: errorMessage(error),
        durationMs: Date.now() - storeStartedAt,
      });
    }
  }

  const syncRan = syncedStores > 0;
  if (syncRan) opts.onSynced?.();

  return { reports, totalProducts, syncRan };
}
