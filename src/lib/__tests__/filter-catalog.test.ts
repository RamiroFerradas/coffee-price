import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/types";
import {
  NO_GRAMS,
  defaultFilters,
  filterCatalog,
  gramFacetOptions,
  parseFilters,
  roasterFacetOptions,
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
    free_shipping: null,
    shipping_note: null,
    installments: null,
    tasting_notes: null,
    process: null,
    roast_level: null,
    altitude: null,
    score: null,
    fetched_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("defaultFilters", () => {
  it("sorts by price per kg ascending and shows coffee only", () => {
    expect(defaultFilters()).toEqual({
      q: "",
      roasters: [],
      grams: [],
      category: "all",
      origin: "all",
      sort: "price_per_kg-asc",
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
        origin: "colombia",
        sort: "price-desc",
      }),
    ).toEqual({
      q: "etiopia",
      roasters: ["momotostadores", "bunatostadores"],
      grams: [250, -1],
      category: "blend",
      origin: "colombia",
      sort: "price-desc",
    });
  });

  it("falls back to defaults on unknown values", () => {
    const parsed = parseFilters({
      category: "espresso",
      sort: "cheapest",
      grams: "abc,1.5,10000000000000000000000",
      roasters: "starbucks,notastore",
    });
    expect(parsed.category).toBe("all");
    expect(parsed.sort).toBe("price_per_kg-asc");
    expect(parsed.grams).toEqual([]);
    expect(parsed.roasters).toEqual([]);
  });

  it("accepts repeated array params", () => {
    const parsed = parseFilters({ roasters: ["flatnwhite", "bunatostadores"], grams: ["500"] });
    expect(parsed.roasters).toEqual(["flatnwhite", "bunatostadores"]);
    expect(parsed.grams).toEqual([500]);
  });

  it("parses the equipment section", () => {
    expect(parseFilters({ category: "equipment" }).category).toBe("equipment");
  });

  it("accepts the gramaje sort keys", () => {
    expect(parseFilters({ sort: "grams-desc" }).sort).toBe("grams-desc");
    expect(parseFilters({ sort: "grams-asc" }).sort).toBe("grams-asc");
  });

  it("ignores the legacy includeEquipment param", () => {
    expect(parseFilters({ includeEquipment: "1" })).toEqual(defaultFilters());
    expect("includeEquipment" in parseFilters({ includeEquipment: "1" })).toBe(false);
  });

  it("ignores the legacy grind param", () => {
    expect(parseFilters({ grind: "ground" })).toEqual(defaultFilters());
    expect("grind" in parseFilters({ grind: "ground" })).toBe(false);
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
      origin: "Brasil",
      sort: "name-asc",
    };
    expect(serializeFilters(filters)).toEqual({
      q: "brasil",
      roasters: "flatnwhite",
      grams: "250,-1",
      origin: "Brasil",
      sort: "name-asc",
    });
  });

  it("serializes the equipment section as a category param", () => {
    expect(serializeFilters({ ...defaultFilters(), category: "equipment" })).toEqual({
      category: "equipment",
    });
  });

  it("round-trips: parse(serialize(f)) equals f", () => {
    const filters: CatalogFilters = {
      q: "etíopía yirgacheffe",
      roasters: ["momotostadores", "fuegotostadores"],
      grams: [250, 500, -1],
      category: "single-origin",
      origin: "Etiopía",
      sort: "price_per_kg-desc",
    };
    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
  });

  it("round-trips defaults", () => {
    expect(parseFilters(serializeFilters(defaultFilters()))).toEqual(defaultFilters());
  });
});

describe("filterCatalog", () => {
  it("hides out-of-stock products", () => {
    const available = product({ id: "in-stock" });
    const soldOut = product({ id: "oos", in_stock: false });
    expect(filterCatalog([available, soldOut], defaultFilters())).toEqual([
      available,
    ]);
  });

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

  it("shows only equipment when the equipment section is selected", () => {
    const filters: CatalogFilters = { ...defaultFilters(), category: "equipment" };
    expect(filterCatalog([coffee, equipment], filters)).toEqual([equipment]);
    expect(filterCatalog([coffee, equipment], { ...filters, q: "colombia" })).toEqual([]);
    expect(filterCatalog([coffee, equipment], { ...filters, q: "molino" })).toEqual([equipment]);
    expect(filterCatalog([coffee, equipment], { ...filters, grams: [250] })).toEqual([]);
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

  it("matches q against tasting notes, process and roast level", () => {
    const specs = product({
      tasting_notes: "chocolate con leche, caramelo",
      process: "Lavado",
      roast_level: "Oscuro",
    });

    expect(filterCatalog([specs], { ...defaultFilters(), q: "caramelo" })).toEqual([specs]);
    expect(filterCatalog([specs], { ...defaultFilters(), q: "lavado" })).toEqual([specs]);
    expect(filterCatalog([specs], { ...defaultFilters(), q: "oscuro" })).toEqual([specs]);
    expect(filterCatalog([specs], { ...defaultFilters(), q: "honey" })).toEqual([]);
  });

  it("keeps altitude and score out of the search", () => {
    const specs = product({ altitude: "1600 msnm", score: 86 });

    expect(filterCatalog([specs], { ...defaultFilters(), q: "msnm" })).toEqual([]);
    expect(filterCatalog([specs], { ...defaultFilters(), q: "86" })).toEqual([]);
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
    const machine = product({ id: "m", category: "equipment", price_per_kg: null });
    const all = [coffee, blend, bare, machine];
    expect(filterCatalog(all, { ...defaultFilters(), category: "blend" })).toEqual([blend]);
    expect(filterCatalog(all, { ...defaultFilters(), category: "single-origin" })).toEqual([coffee]);
    expect(filterCatalog(all, { ...defaultFilters(), category: "equipment" })).toEqual([machine]);
    expect(filterCatalog(all, defaultFilters())).toHaveLength(3);
  });

  it("filters by origin case-insensitively and excludes null origins", () => {
    const colombia = product({ id: "co", origin: "Colombia" });
    const brasil = product({ id: "br", origin: "Brasil" });
    const blend = product({ id: "bl", origin: null });
    const all = [colombia, brasil, blend];
    expect(filterCatalog(all, { ...defaultFilters(), origin: "Colombia" })).toEqual([colombia]);
    expect(filterCatalog(all, { ...defaultFilters(), origin: "COLOMBIA" })).toEqual([colombia]);
    expect(filterCatalog(all, { ...defaultFilters(), origin: "Etiopía" })).toEqual([]);
  });

  it("returns every product when the origin filter is all", () => {
    const all = [product({ id: "a", origin: "Colombia" }), product({ id: "b", origin: null })];
    expect(filterCatalog(all, { ...defaultFilters(), origin: "all" })).toEqual(all);
  });

  it("combines the origin filter with other filters", () => {
    const match = product({ id: "m", origin: "Colombia", category: "single-origin" });
    const otherOrigin = product({ id: "o", origin: "Brasil", category: "single-origin" });
    const otherCategory = product({ id: "c", origin: "Colombia", category: "blend" });
    const filters: CatalogFilters = {
      ...defaultFilters(),
      origin: "Colombia",
      category: "single-origin",
    };
    expect(filterCatalog([match, otherOrigin, otherCategory], filters)).toEqual([match]);
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

describe("gramFacetOptions", () => {
  const coffee = product({ id: "c", grams: 250 });
  const halfKilo = product({ id: "h", grams: 500 });
  const gear = product({
    id: "g",
    name: "Molino Manual",
    category: "equipment",
    origin: null,
    grams: 750,
    price_per_kg: null,
  });
  const gearNoGrams = product({
    id: "gn",
    name: "Curso de barismo",
    category: "equipment",
    origin: null,
    grams: null,
    price_per_kg: null,
  });
  const bare = product({ id: "n", grams: null, price_per_kg: null });

  it("drops gram sizes that only exist on equipment in the coffee view", () => {
    expect(gramFacetOptions([coffee, halfKilo, gear], defaultFilters())).toEqual({
      values: [500, 250],
      hasNull: false,
    });
  });

  it("lists equipment gram sizes in the equipment section", () => {
    expect(gramFacetOptions([coffee, gear], { ...defaultFilters(), category: "equipment" })).toEqual(
      { values: [750], hasNull: false },
    );
  });

  it("offers the null-grams option only for products visible in the current section", () => {
    expect(gramFacetOptions([coffee, bare], defaultFilters()).hasNull).toBe(true);
    expect(gramFacetOptions([coffee, gearNoGrams], defaultFilters()).hasNull).toBe(false);
    expect(gramFacetOptions([coffee], { ...defaultFilters(), grams: [NO_GRAMS] }).hasNull).toBe(true);
  });

  it("keeps the active selection visible in its descending position", () => {
    const options = gramFacetOptions([coffee, halfKilo], { ...defaultFilters(), grams: [125] });
    expect(options.values).toEqual([500, 250, 125]);
  });

  it("puts 1 kg first even when it comes only from the active selection", () => {
    const options = gramFacetOptions([coffee, halfKilo], { ...defaultFilters(), grams: [1000] });
    expect(options.values).toEqual([1000, 500, 250]);
  });

  it("keeps 1 kg first when the active selection adds a middle value", () => {
    const kilo = product({ id: "k", grams: 1000 });
    const options = gramFacetOptions([coffee, kilo], { ...defaultFilters(), grams: [500] });
    expect(options.values).toEqual([1000, 500, 250]);
  });

  it("puts 2 kg first even when it comes only from the active selection", () => {
    const options = gramFacetOptions([coffee, halfKilo], { ...defaultFilters(), grams: [2000] });
    expect(options.values).toEqual([2000, 500, 250]);
  });

  it("inserts an active middle value into the descending order", () => {
    const threeQuarter = product({ id: "tq", grams: 750 });
    const options = gramFacetOptions([coffee, threeQuarter], { ...defaultFilters(), grams: [500] });
    expect(options.values).toEqual([750, 500, 250]);
  });

  it("applies the other active filters", () => {
    const wholeBean = product({ id: "wb", grams: 250 });
    const ground = product({ id: "gd", store: "flatnwhite", roaster: "Flat & White", grams: 1000 });
    expect(gramFacetOptions([wholeBean, ground], { ...defaultFilters(), roasters: ["flatnwhite"] })).toEqual({
      values: [1000],
      hasNull: false,
    });
  });
});

describe("roasterFacetOptions", () => {
  const cafe = product({ id: "c" });
  const gear = product({
    id: "g",
    store: "flatnwhite",
    roaster: "Flat & White",
    name: "Molino Manual",
    category: "equipment",
    origin: null,
    grams: null,
    price_per_kg: null,
  });

  it("drops roasters with no products in the current category", () => {
    expect(roasterFacetOptions([cafe, gear], defaultFilters())).toEqual(["indigoroasters"]);
    expect(
      roasterFacetOptions([cafe, gear], { ...defaultFilters(), category: "equipment" }),
    ).toEqual(["flatnwhite"]);
  });

  it("ignores the roasters filter itself and keeps the active selection visible", () => {
    const filters: CatalogFilters = { ...defaultFilters(), roasters: ["flatnwhite"] };
    expect(roasterFacetOptions([cafe, gear], filters)).toEqual(["indigoroasters", "flatnwhite"]);
  });

  it("applies the other active filters", () => {
    const groundCoffee = product({
      id: "gc",
      store: "flatnwhite",
      roaster: "Flat & White",
      origin: "Etiopía",
    });
    expect(roasterFacetOptions([cafe, groundCoffee], { ...defaultFilters(), origin: "Brasil" })).toEqual([]);
    expect(roasterFacetOptions([cafe, groundCoffee], { ...defaultFilters(), origin: "Etiopía" })).toEqual([
      "flatnwhite",
    ]);
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

  it("sorts by grams descending with nulls last", () => {
    const light = product({ id: "light", grams: 250 });
    const heavy = product({ id: "heavy", grams: 1000 });
    const noGrams = product({ id: "nog", grams: null, price_per_kg: null });
    expect(sortCatalog([light, noGrams, heavy], "grams-desc").map((p) => p.id)).toEqual([
      "heavy",
      "light",
      "nog",
    ]);
  });

  it("sorts by grams ascending with nulls last", () => {
    const light = product({ id: "light", grams: 250 });
    const heavy = product({ id: "heavy", grams: 1000 });
    const noGrams = product({ id: "nog", grams: null, price_per_kg: null });
    expect(sortCatalog([heavy, noGrams, light], "grams-asc").map((p) => p.id)).toEqual([
      "light",
      "heavy",
      "nog",
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
