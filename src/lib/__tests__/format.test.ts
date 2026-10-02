import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/types";
import { availableGrams, formatArs, formatPerKg, formatRelativeTime } from "../format";

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

describe("availableGrams", () => {
  it("returns distinct non-null grams with common sizes first", () => {
    const products = [
      product({ grams: 1000 }),
      product({ grams: 340 }),
      product({ grams: 250 }),
      product({ grams: null }),
      product({ grams: 500 }),
      product({ grams: 250 }),
      product({ grams: 125 }),
    ];
    expect(availableGrams(products)).toEqual([250, 500, 1000, 125, 340]);
  });

  it("returns only the common sizes that exist", () => {
    expect(availableGrams([product({ grams: 500 })])).toEqual([500]);
    expect(availableGrams([product({ grams: null })])).toEqual([]);
    expect(availableGrams([])).toEqual([]);
  });
});
