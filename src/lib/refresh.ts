import { STORES, type StoreConfig } from "@/scrapers/stores";
import type { StoreId } from "@/lib/types";

export function dueStores(
  now: Date,
  lastSynced: Partial<Record<StoreId, Date>>,
): StoreConfig[] {
  return STORES.filter((store) => {
    const last = lastSynced[store.id];
    if (!last) return true;
    return now.getTime() - last.getTime() >= store.refreshMinutes * 60_000;
  });
}

export function getLastSyncedMap(
  rows: { store: StoreId; fetched_at: string }[],
): Partial<Record<StoreId, Date>> {
  const latest: Partial<Record<StoreId, Date>> = {};
  for (const row of rows) {
    const fetchedAt = new Date(row.fetched_at);
    const current = latest[row.store];
    if (!current || fetchedAt.getTime() > current.getTime()) {
      latest[row.store] = fetchedAt;
    }
  }
  return latest;
}
