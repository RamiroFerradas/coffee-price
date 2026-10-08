import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log("NOT_CONFIGURED");
  process.exit(0);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await db
  .from("products")
  .select("store, grams, price, price_per_kg, name");
if (error) {
  console.log("ERR", error.message);
  process.exit(1);
}
const rows = data ?? [];
const nullGrams = rows.filter((r) => r.grams === null);
const nullPpk = rows.filter((r) => r.price_per_kg === null);
console.log(JSON.stringify({
  total: rows.length,
  null_grams: nullGrams.length,
  null_price_per_kg: nullPpk.length,
  by_store: [...new Set(rows.map((r) => r.store))].map((s) => ({
    store: s,
    total: rows.filter((r) => r.store === s).length,
    null_grams: rows.filter((r) => r.store === s && r.grams === null).length,
    null_ppk: rows.filter((r) => r.store === s && r.price_per_kg === null).length,
  })),
  sample_null_grams: nullGrams.slice(0, 5).map((r) => r.name),
}, null, 2));
