import { describe, expect, it } from "vitest";
import { getLastSynced, syncStore, toRow } from "@/lib/persistence";
import type { RawProduct } from "@/lib/types";
import { createFakeDb } from "./fake-db";

const FETCHED_AT = new Date("2026-01-15T12:00:00.000Z");
const ISO = "2026-01-15T12:00:00.000Z";

const ENRICHED: RawProduct = {
  store: "cafedelirante",
  external_id: "sku-1",
  name: "Colombia Huila 250g",
  url: "https://cafedelirante.com.ar/p/1",
  roaster: "Café Delirante",
  price: 12000,
  image_url: "https://cdn.example.com/1.jpg",
  origin: "Colombia",
  variety: "Bourbon",
  category: "single-origin",
  grind: "whole-bean",
  grams: 250,
  in_stock: true,
  free_shipping: true,
  shipping_note: "Envío gratis desde $70.000",
  installments: "3 cuotas sin interés",
  tasting_notes: "chocolate, caramelo",
  process: "Lavado",
  roast_level: "Medio",
  altitude: "1600 msnm",
  score: 86,
};

describe("toRow", () => {
  it("maps a raw product to the snake_case insert payload", () => {
    const row = toRow("cafedelirante", ENRICHED, FETCHED_AT);
    expect(row).toEqual({
      store: "cafedelirante",
      external_id: "sku-1",
      name: "Colombia Huila 250g",
      url: "https://cafedelirante.com.ar/p/1",
      image_url: "https://cdn.example.com/1.jpg",
      roaster: "Café Delirante",
      origin: "Colombia",
      variety: "Bourbon",
      category: "single-origin",
      grind: "whole-bean",
      grams: 250,
      price: 12000,
      in_stock: true,
      free_shipping: true,
      shipping_note: "Envío gratis desde $70.000",
      installments: "3 cuotas sin interés",
      tasting_notes: "chocolate, caramelo",
      process: "Lavado",
      roast_level: "Medio",
      altitude: "1600 msnm",
      score: 86,
      fetched_at: ISO,
    });
    expect(row).not.toHaveProperty("id");
    expect(row).not.toHaveProperty("price_per_kg");
  });

  it("round-trips the shipping and installments fields including a false flag", () => {
    const row = toRow("indiosverdes", {
      ...ENRICHED,
      store: "indiosverdes",
      free_shipping: false,
      shipping_note: "Llega por $2.500",
      installments: null,
    }, FETCHED_AT);
    expect(row.free_shipping).toBe(false);
    expect(row.shipping_note).toBe("Llega por $2.500");
    expect(row.installments).toBeNull();
  });

  it("fills missing optional fields with null and keeps numeric types", () => {
    const row = toRow("momotostadores", {
      store: "momotostadores",
      external_id: "x",
      name: "Blend Espresso",
      url: "https://momotostadores.com/p/2",
      roaster: "Momo Tostadores",
      price: 9500,
    }, FETCHED_AT);
    expect(row.price).toBe(9500);
    expect(row.grams).toBeNull();
    expect(row.image_url).toBeNull();
    expect(row.origin).toBeNull();
    expect(row.variety).toBeNull();
    expect(row.category).toBeNull();
    expect(row.grind).toBeNull();
    expect(row.in_stock).toBe(true);
    expect(row.free_shipping).toBeNull();
    expect(row.shipping_note).toBeNull();
    expect(row.installments).toBeNull();
    expect(row.tasting_notes).toBeNull();
    expect(row.process).toBeNull();
    expect(row.roast_level).toBeNull();
    expect(row.altitude).toBeNull();
    expect(row.score).toBeNull();
  });

  it("passes through in_stock=false from the scraper", () => {
    const row = toRow("flatnwhite", { ...ENRICHED, in_stock: false }, FETCHED_AT);
    expect(row.in_stock).toBe(false);
  });
});

describe("syncStore", () => {
  it("upserts with the store,external_id conflict target, then prunes stale rows", async () => {
    const fake = createFakeDb({ deleteData: [{ id: "old-1" }, { id: "old-2" }] });

    const result = await syncStore("cafedelirante", [ENRICHED], FETCHED_AT, fake.db);

    expect(fake.upserts).toHaveLength(1);
    expect(fake.upserts[0].table).toBe("products");
    expect(fake.upserts[0].options).toEqual({ onConflict: "store,external_id" });
    const rows = fake.upserts[0].rows as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      store: "cafedelirante",
      external_id: "sku-1",
      fetched_at: ISO,
      price: 12000,
      grams: 250,
    });
    expect(rows[0]).not.toHaveProperty("price_per_kg");
    expect(rows[0]).not.toHaveProperty("id");

    expect(fake.deletes).toHaveLength(1);
    expect(fake.deletes[0].table).toBe("products");
    expect(fake.deletes[0].filters).toEqual([
      { op: "eq", column: "store", value: "cafedelirante" },
      { op: "lt", column: "fetched_at", value: ISO },
    ]);
    expect(result).toEqual({ inserted: 1, pruned: 2 });
  });

  it("prunes everything even when the scrape returned no products", async () => {
    const fake = createFakeDb({ deleteData: [{ id: "a" }, { id: "b" }, { id: "c" }] });

    const result = await syncStore("bunatostadores", [], FETCHED_AT, fake.db);

    expect(fake.upserts).toHaveLength(0);
    expect(fake.deletes[0].filters).toEqual([
      { op: "eq", column: "store", value: "bunatostadores" },
      { op: "lt", column: "fetched_at", value: ISO },
    ]);
    expect(result).toEqual({ inserted: 0, pruned: 3 });
  });

  it("rejects when the upsert fails and does not prune", async () => {
    const fake = createFakeDb({ upsertError: "duplicate key value" });

    await expect(syncStore("cafedelirante", [ENRICHED], FETCHED_AT, fake.db)).rejects.toThrow(
      /duplicate key value/,
    );
    expect(fake.deletes).toHaveLength(0);
  });

  it("rejects when the prune fails", async () => {
    const fake = createFakeDb({ deleteError: "permission denied" });

    await expect(syncStore("cafedelirante", [ENRICHED], FETCHED_AT, fake.db)).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("getLastSynced", () => {
  it("reads store/fetched_at newest-first and maps the latest row per store", async () => {
    const fake = createFakeDb({
      selectData: [
        { store: "cafedelirante", fetched_at: "2026-01-15T11:00:00.000Z" },
        { store: "cafedelirante", fetched_at: "2026-01-15T10:00:00.000Z" },
        { store: "flatnwhite", fetched_at: "2026-01-15T09:00:00.000Z" },
      ],
    });

    const map = await getLastSynced(fake.db);

    expect(fake.selects).toHaveLength(1);
    expect(fake.selects[0]).toMatchObject({
      table: "products",
      columns: "store, fetched_at",
      orders: [{ column: "fetched_at", options: { ascending: false } }],
    });
    expect(map.cafedelirante).toEqual(new Date("2026-01-15T11:00:00.000Z"));
    expect(map.flatnwhite).toEqual(new Date("2026-01-15T09:00:00.000Z"));
  });

  it("returns an empty map when the table has no rows", async () => {
    const fake = createFakeDb({ selectData: null });
    expect(await getLastSynced(fake.db)).toEqual({});
  });

  it("rejects when the read fails", async () => {
    const fake = createFakeDb({ selectError: "connection reset" });
    await expect(getLastSynced(fake.db)).rejects.toThrow(/connection reset/);
  });
});
