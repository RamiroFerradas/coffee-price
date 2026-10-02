import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/types";
import {
  defaultFilters,
  filterCatalog,
  parseFilters,
  serializeFilters,
  sortCatalog,
  type CatalogFilters,
} from "../filter-catalog";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    store: "indigoroasters",
    external_id: "1",
    name: "Café de Colombia Huila",
    url: "https://example.com/p",
    image_url: null,
    roaster: "Indigo Coffee Roasters",
    origin: "Colombia",
    variety: null,
    category: "single-origin",
    grind: null,
    grams: 250,
    price: 8000,
    price_per_kg: 32000,
    in_stock: true,
    fetched_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("defaultFilters", () => {
  it("sorts by price per kg ascending and hides equipment", () => {
    expect(defaultFilters()).toEqual({
      q: "",
      roasters: [],
      grams: [],
      category: "all",
      grind: "all",
      sort: "price_per_kg-asc",
      includeEquipment: false,
    });
  });
});

describe("parseFilters", () => {
  it("returns defaults for empty params", () => {
    expect(parseFilters({})).toEqual(defaultFilters());
  });

  it("parses every field", () => {
    expect(
      parseFilters({
        q: "etiopia",
        roasters: "momotostadores,bunatostadores",
        grams: "250,-1",
        category: "blend",
        grind: "ground",
        sort: "price-desc",
        includeEquipment: "1",
      }),
    ).toEqual({
      q: "etiopia",
      roasters: ["momotostadores", "bunatostadores"],
      grams: [250, -1],
      category: "blend",
      grind: "ground",
      sort: "price-desc",
      includeEquipment: true,
    });
  });

  it("falls back to defaults on unknown values", () => {
    const parsed = parseFilters({
      category: "espresso",
      grind: "instant",
      sort: "cheapest",
      grams: "abc,1.5,10000000000000000000000",
      roasters: "starbucks,notastore",
      includeEquipment: "yes-please",
    });
    expect(parsed.category).toBe("all");
    expect(parsed.grind).toBe("all");
    expect(parsed.sort).toBe("price_per_kg-asc");
    expect(parsed.grams).toEqual([]);
    expect(parsed.roasters).toEqual([]);
    expect(parsed.includeEquipment).toBe(false);
  });

  it("accepts repeated array params", () => {
    const parsed = parseFilters({ roasters: ["flatnwhite", "bunatostadores"], grams: ["500"] });
    expect(parsed.roasters).toEqual(["flatnwhite", "bunatostadores"]);
    expect(parsed.grams).toEqual([500]);
  });

  it("accepts true as includeEquipment", () => {
    expect(parseFilters({ includeEquipment: "true" }).includeEquipment).toBe(true);
  });

  it("keeps partial garbage tolerant per field", () => {
    const parsed = parseFilters({ roasters: "flatnwhite,bogus", grams: "250,xx,1000" });
    expect(parsed.roasters).toEqual(["flatnwhite"]);
    expect(parsed.grams).toEqual([250, 1000]);
  });
});

describe("serializeFilters", () => {
  it("omits defaults for a clean URL", () => {
    expect(serializeFilters(defaultFilters())).toEqual({});
  });

  it("serializes only non-default fields", () => {
    const filters: CatalogFilters = {
      q: "brasil",
      roasters: ["flatnwhite"],
      grams: [250, -1],
      category: "all",
      grind: "whole-bean",
      sort: "name-asc",
      includeEquipment: true,
    };
    expect(serializeFilters(filters)).toEqual({
      q: "brasil",
      roasters: "flatnwhite",
      grams: "250,-1",
      grind: "whole-bean",
      sort: "name-asc",
      includeEquipment: "1",
    });
  });

  it("round-trips: parse(serialize(f)) equals f", () => {
    const filters: CatalogFilters = {
      q: "etíopía yirgacheffe",
      roasters: ["momotostadores", "fuegotostadores"],
      grams: [250, 500, -1],
      category: "single-origin",
      grind: "ground",
      sort: "price_per_kg-desc",
      includeEquipment: true,
    };
    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
  });

  it("round-trips defaults", () => {
    expect(parseFilters(serializeFilters(defaultFilters()))).toEqual(defaultFilters());
  });
});

describe("filterCatalog", () => {
  const coffee = product();
  const equipment = product({
    id: "eq1",
    name: "Molino Baratza Encore",
    category: "equipment",
    origin: null,
    grams: null,
    price_per_kg: null,
  });

  it("excludes equipment by default", () => {
    expect(filterCatalog([coffee, equipment], defaultFilters())).toEqual([coffee]);
  });

  it("includes equipment when asked, still passing other filters", () => {
    const withEquipment = { ...defaultFilters(), includeEquipment: true };
    expect(filterCatalog([coffee, equipment], withEquipment)).toHaveLength(2);

    const filtered = { ...withEquipment, q: "molino" };
    expect(filterCatalog([coffee, equipment], filtered)).toEqual([equipment]);

    const excluded = { ...withEquipment, grams: [250] };
    expect(filterCatalog([coffee, equipment], excluded)).toEqual([coffee]);
  });

  it("matches q against name case-insensitively", () => {
    const filters = { ...defaultFilters(), q: "HUILA" };
    expect(filterCatalog([coffee, product({ id: "p2", name: "Blend Espresso" })], filters)).toEqual([
      coffee,
    ]);
  });

  it("matches q against origin, variety and roaster", () => {
    expect(filterCatalog([coffee], { ...defaultFilters(), q: "colombia" })).toEqual([coffee]);
    expect(
      filterCatalog([product({ variety: "Bourbon" })], { ...defaultFilters(), q: "bourbon" }),
    ).toEqual([product({ variety: "Bourbon" })]);
    expect(filterCatalog([coffee], { ...defaultFilters(), q: "indigo" })).toEqual([coffee]);
  });

  it("ignores accents in q", () => {
    const ethiopia = product({ id: "et", name: "Etiopía Yirgacheffe", origin: "Etiopía" });
    expect(filterCatalog([ethiopia], { ...defaultFilters(), q: "etíopía" })).toEqual([ethiopia]);
    expect(filterCatalog([ethiopia], { ...defaultFilters(), q: "ETIOPIA" })).toEqual([ethiopia]);
  });

  it("requires every q token to match", () => {
    const target = product({ name: "Brasil Natural" });
    expect(filterCatalog([target], { ...defaultFilters(), q: "brasil tostado" })).toEqual([]);
    expect(filterCatalog([target], { ...defaultFilters(), q: "brasil nat" })).toEqual([target]);
  });

  it("filters by store", () => {
    const mine = product({ store: "flatnwhite", roaster: "Flat & White" });
    const other = product({ id: "p2" });
    expect(filterCatalog([mine, other], { ...defaultFilters(), roasters: ["flatnwhite"] })).toEqual([
      mine,
    ]);
    expect(
      filterCatalog([mine, other], { ...defaultFilters(), roasters: ["flatnwhite", "indigoroasters"] }),
    ).toEqual([mine, other]);
  });

  it("filters by exact grams with a -1 sentinel for null grams", () => {
    const nullGrams = product({ id: "ng", grams: null, price_per_kg: null });
    const fiveHundred = product({ id: "fh", grams: 500 });
    const all = [coffee, nullGrams, fiveHundred];

    expect(filterCatalog(all, { ...defaultFilters(), grams: [250] })).toEqual([coffee]);
    expect(filterCatalog(all, { ...defaultFilters(), grams: [-1] })).toEqual([nullGrams]);
    expect(filterCatalog(all, { ...defaultFilters(), grams: [250, -1] })).toEqual([coffee, nullGrams]);
  });

  it("filters by category", () => {
    const blend = product({ id: "b", category: "blend" });
    const bare = product({ id: "n", category: null });
    expect(filterCatalog([coffee, blend, bare], { ...defaultFilters(), category: "blend" })).toEqual([
      blend,
    ]);
    expect(
      filterCatalog([coffee, blend, bare], { ...defaultFilters(), category: "single-origin" }),
    ).toEqual([coffee]);
    expect(filterCatalog([coffee, blend, bare], defaultFilters())).toHaveLength(3);
  });

  it("filters by grind", () => {
    const ground = product({ id: "g", grind: "ground" });
    expect(filterCatalog([coffee, ground], { ...defaultFilters(), grind: "whole-bean" })).toEqual([]);
    expect(filterCatalog([coffee, ground], { ...defaultFilters(), grind: "ground" })).toEqual([ground]);
  });

  it("combines filters", () => {
    const match = product({ store: "flatnwhite", roaster: "Flat & White", grams: 250 });
    const miss1 = product({ id: "m1", store: "flatnwhite", roaster: "Flat & White", grams: 1000 });
    const miss2 = product({ id: "m2", store: "cafedelirante", roaster: "Café Delirante", grams: 250 });
    const filters: CatalogFilters = {
      ...defaultFilters(),
      roasters: ["flatnwhite"],
      grams: [250],
      q: "colombia",
    };
    expect(filterCatalog([match, miss1, miss2], filters)).toEqual([match]);
  });
});

describe("sortCatalog", () => {
  const cheap = product({ id: "cheap", name: "Argentina", roaster: "Alpha", price: 5000, price_per_kg: 20000 });
  const mid = product({ id: "mid", name: "Brasil", roaster: "Beta", price: 9000, price_per_kg: 30000 });
  const noPerKg = product({ id: "npk", name: "Chile", roaster: "Gamma", price: 7000, price_per_kg: null });

  it("sorts by price per kg ascending with nulls last", () => {
    expect(sortCatalog([noPerKg, mid, cheap], "price_per_kg-asc").map((p) => p.id)).toEqual([
      "cheap",
      "mid",
      "npk",
    ]);
  });

  it("sorts by price per kg descending with nulls last", () => {
    expect(sortCatalog([noPerKg, cheap, mid], "price_per_kg-desc").map((p) => p.id)).toEqual([
      "mid",
      "cheap",
      "npk",
    ]);
  });

  it("sorts by price ascending and descending", () => {
    expect(sortCatalog([mid, noPerKg, cheap], "price-asc").map((p) => p.id)).toEqual([
      "cheap",
      "npk",
      "mid",
    ]);
    expect(sortCatalog([cheap, noPerKg, mid], "price-desc").map((p) => p.id)).toEqual([
      "mid",
      "npk",
      "cheap",
    ]);
  });

  it("sorts by name", () => {
    expect(sortCatalog([mid, cheap, noPerKg], "name-asc").map((p) => p.id)).toEqual([
      "cheap",
      "mid",
      "npk",
    ]);
  });

  it("sorts by roaster and keeps input order on ties", () => {
    const tiedA = product({ id: "a", roaster: "Zeta" });
    const tiedB = product({ id: "b", roaster: "Zeta" });
    const sorted = sortCatalog([tiedB, cheap, tiedA], "roaster-asc");
    expect(sorted.map((p) => p.id)).toEqual(["cheap", "b", "a"]);
  });

  it("is stable for equal keys and does not mutate the input", () => {
    const input = [mid, cheap];
    const copy = [...input];
    const sorted = sortCatalog(input, "price-asc");
    expect(sorted.map((p) => p.id)).toEqual(["cheap", "mid"]);
    expect(input).toEqual(copy);
  });
});
