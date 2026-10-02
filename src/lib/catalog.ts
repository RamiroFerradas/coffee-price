import { cacheLife, cacheTag } from "next/cache";
import { getLastSyncedMap } from "@/lib/refresh";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { Product, StoreId } from "@/lib/types";
import { STORES } from "@/scrapers/stores";

export interface CatalogMeta {
  updatedAt: string | null;
  stores: { store: StoreId; updatedAt: string }[];
}

export function isSupabaseConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function getCatalog(): Promise<Product[]> {
  "use cache";
  cacheTag("products");
  cacheLife("hours");

  if (!isSupabaseConfigured()) return [];

  const db = createSupabaseAdmin();
  const { data, error } = await db
    .from("products")
    .select("*")
    .order("roaster")
    .order("name");
  if (error) throw new Error(`Reading the catalog failed: ${error.message}`);
  return (data ?? []) as Product[];
}

export async function getCatalogMeta(): Promise<CatalogMeta> {
  "use cache";
  cacheTag("products");
  cacheLife("hours");

  if (!isSupabaseConfigured()) return { updatedAt: null, stores: [] };

  const db = createSupabaseAdmin();
  const { data, error } = await db.from("products").select("store, fetched_at");
  if (error) throw new Error(`Reading catalog metadata failed: ${error.message}`);

  const latest = getLastSyncedMap(
    (data ?? []) as { store: StoreId; fetched_at: string }[],
  );

  let newest: Date | null = null;
  for (const fetchedAt of Object.values(latest)) {
    if (fetchedAt && (!newest || fetchedAt.getTime() > newest.getTime())) {
      newest = fetchedAt;
    }
  }

  const stores: CatalogMeta["stores"] = [];
  for (const config of STORES) {
    const fetchedAt = latest[config.id];
    if (fetchedAt) {
      stores.push({ store: config.id, updatedAt: fetchedAt.toISOString() });
    }
  }

  return { updatedAt: newest ? newest.toISOString() : null, stores };
}
