import { getLastSyncedMap } from "@/lib/refresh";
import type { Product, RawProduct, StoreId } from "@/lib/types";

export type ProductRow = Omit<Product, "id" | "price_per_kg">;

interface SyncResult {
  data?: unknown;
  error: { message: string } | null;
}

interface ReadResult {
  data: unknown;
  error: { message: string } | null;
}

export interface SupabaseDeleteChain extends PromiseLike<SyncResult> {
  eq(column: string, value: unknown): SupabaseDeleteChain;
  lt(column: string, value: string): SupabaseDeleteChain;
  select(columns?: string): SupabaseDeleteChain;
}

export interface SupabaseReadBuilder {
  order(
    column: string,
    options?: { ascending?: boolean },
  ): PromiseLike<ReadResult>;
}

export interface SupabaseTable {
  upsert(
    rows: readonly unknown[],
    options?: { onConflict?: string },
  ): PromiseLike<SyncResult>;
  delete(): SupabaseDeleteChain;
  select(columns: string): SupabaseReadBuilder;
}

export interface SupabaseLike {
  from(table: string): SupabaseTable;
}

export function toRow(store: StoreId, raw: RawProduct, fetchedAt: Date): ProductRow {
  return {
    store,
    external_id: raw.external_id,
    name: raw.name,
    url: raw.url,
    image_url: raw.image_url ?? null,
    roaster: raw.roaster,
    origin: raw.origin ?? null,
    variety: raw.variety ?? null,
    category: raw.category ?? null,
    grind: raw.grind ?? null,
    grams: raw.grams ?? null,
    price: raw.price,
    in_stock: raw.in_stock ?? true,
    fetched_at: fetchedAt.toISOString(),
  };
}

export async function syncStore(
  store: StoreId,
  products: RawProduct[],
  fetchedAt: Date,
  db: SupabaseLike,
): Promise<{ inserted: number; pruned: number }> {
  const rows = products.map((raw) => toRow(store, raw, fetchedAt));

  if (rows.length > 0) {
    const { error } = await db
      .from("products")
      .upsert(rows, { onConflict: "store,external_id" });
    if (error) throw new Error(`Upsert failed for ${store}: ${error.message}`);
  }

  const { data, error } = await db
    .from("products")
    .delete()
    .eq("store", store)
    .lt("fetched_at", fetchedAt.toISOString())
    .select("id");
  if (error) throw new Error(`Prune failed for ${store}: ${error.message}`);

  return { inserted: rows.length, pruned: Array.isArray(data) ? data.length : 0 };
}

export async function getLastSynced(
  db: SupabaseLike,
): Promise<Partial<Record<StoreId, Date>>> {
  const { data, error } = await db
    .from("products")
    .select("store, fetched_at")
    .order("fetched_at", { ascending: false });
  if (error) throw new Error(`Reading last sync timestamps failed: ${error.message}`);
  if (!data) return {};
  return getLastSyncedMap(data as { store: StoreId; fetched_at: string }[]);
}
