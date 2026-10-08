import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/types";
import {
  availableGrams,
  formatArs,
  formatGrams,
  formatGramsLine,
  formatPerKg,
  formatRelativeTime,
  sortGramValues,
} from "../format";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    store: "indigoroasters",
    external_id: "1",
    name: "Café",
    url: "https://example.com/p",
    image_url: null,
    roaster: "Indigo",
    origin: null,
    variety: null,
    category: null,
    grind: null,
    grams: null,
    price: 0,
    price_per_kg: null,
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

describe("formatArs", () => {
  it("formats Argentine pesos without decimals", () => {
    expect(formatArs(27800)).toBe("$27.800");
    expect(formatArs(111200)).toBe("$111.200");
    expect(formatArs(0)).toBe("$0");
    expect(formatArs(1000000)).toBe("$1.000.000");
  });
});

describe("formatPerKg", () => {
  it("formats price per kilo", () => {
    expect(formatPerKg(111200)).toBe("$111.200/kg");
  });

  it("returns null when there is no price per kilo", () => {
    expect(formatPerKg(null)).toBeNull();
  });
});

describe("formatGrams", () => {
  it("formats exact kilos without decimals", () => {
    expect(formatGrams(1000)).toBe("1 kg");
    expect(formatGrams(3000)).toBe("3 kg");
    expect(formatGrams(50000)).toBe("50 kg");
  });

  it("keeps the exact fraction with an es-AR decimal comma", () => {
    expect(formatGrams(2800)).toBe("2,8 kg");
    expect(formatGrams(1660)).toBe("1,66 kg");
    expect(formatGrams(1001)).toBe("1,001 kg");
  });

  it("formats sub-kilo amounts in grams", () => {
    expect(formatGrams(500)).toBe("500 g");
    expect(formatGrams(166)).toBe("166 g");
    expect(formatGrams(250)).toBe("250 g");
  });
});

describe("formatGramsLine", () => {
  it("keeps the per-kilo price on exact-kilo products", () => {
    expect(formatGramsLine(1000, 73500)).toBe("1 kg · $73.500/kg");
    expect(formatGramsLine(3000, 45000)).toBe("3 kg · $45.000/kg");
  });

  it("joins sub-kilo weight with the per-kilo price", () => {
    expect(formatGramsLine(250, 120000)).toBe("250 g · $120.000/kg");
    expect(formatGramsLine(2800, 36821)).toBe("2,8 kg · $36.821/kg");
  });

  it("falls back to the weight alone when the per-kilo price is missing", () => {
    expect(formatGramsLine(1000, null)).toBe("1 kg");
    expect(formatGramsLine(500, null)).toBe("500 g");
  });

  it("returns null when there is no weight", () => {
    expect(formatGramsLine(null, 5000)).toBeNull();
    expect(formatGramsLine(null, null)).toBeNull();
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("returns recién for less than a minute", () => {
    expect(formatRelativeTime("2026-06-15T11:59:30.000Z", now)).toBe("recién");
    expect(formatRelativeTime("2026-06-15T12:00:30.000Z", now)).toBe("recién");
  });

  it("returns minutes, hours and days", () => {
    expect(formatRelativeTime("2026-06-15T11:55:00.000Z", now)).toBe("hace 5 min");
    expect(formatRelativeTime("2026-06-15T10:00:00.000Z", now)).toBe("hace 2 h");
    expect(formatRelativeTime("2026-06-12T12:00:00.000Z", now)).toBe("hace 3 días");
    expect(formatRelativeTime("2026-06-15T11:00:00.000Z", now)).toBe("hace 1 h");
  });

  it("rounds down to the current unit", () => {
    expect(formatRelativeTime("2026-06-15T11:58:30.000Z", now)).toBe("hace 1 min");
    expect(formatRelativeTime("2026-06-14T12:30:00.000Z", now)).toBe("hace 23 h");
  });
});

describe("sortGramValues", () => {
  it("sorts descending so kg values come first", () => {
    expect(sortGramValues([125, 250, 1000, 500, 2000])).toEqual([2000, 1000, 500, 250, 125]);
  });

  it("deduplicates and sorts unsorted input descending", () => {
    expect(sortGramValues([250, 1000, 250, 125, 1000])).toEqual([1000, 250, 125]);
  });
});

describe("availableGrams", () => {
  it("puts the biggest values first, descending, when 1 kg is present", () => {
    const products = [
      product({ grams: 1000 }),
      product({ grams: 340 }),
      product({ grams: 250 }),
      product({ grams: null }),
      product({ grams: 500 }),
      product({ grams: 250 }),
      product({ grams: 125 }),
    ];
    expect(availableGrams(products)).toEqual([1000, 500, 340, 250, 125]);
  });

  it("returns descending order when 1 kg is absent", () => {
    const products = [
      product({ grams: 500 }),
      product({ grams: 125 }),
      product({ grams: 340 }),
    ];
    expect(availableGrams(products)).toEqual([500, 340, 125]);
  });

  it("deduplicates unsorted input in descending order", () => {
    const products = [
      product({ grams: 340 }),
      product({ grams: 125 }),
      product({ grams: 340 }),
      product({ grams: 250 }),
    ];
    expect(availableGrams(products)).toEqual([340, 250, 125]);
  });

  it("returns only the grams that exist", () => {
    expect(availableGrams([product({ grams: 500 })])).toEqual([500]);
    expect(availableGrams([product({ grams: null })])).toEqual([]);
    expect(availableGrams([])).toEqual([]);
  });
});
