import { describe, expect, it } from "vitest";
import { en } from "@/i18n/dictionaries/en";
import { es } from "@/i18n/dictionaries/es";
import type { Product } from "@/lib/types";
import {
  JUST_NOW_LABEL,
  availableGrams,
  bucketGrams,
  formatArs,
  formatGrams,
  formatPriceBlock,
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

describe("formatPriceBlock", () => {
  it("shows the per-kilo price as the primary figure with a 1 kg reference", () => {
    expect(
      formatPriceBlock(
        product({ grams: 2800, price: 106600, price_per_kg: 38071 }),
        es.productCard,
      ),
    ).toEqual({
      perKg: "$38.071",
      reference: "por 1 kg · total $106.600",
    });
  });

  it("uses the English labels for the reference line", () => {
    expect(
      formatPriceBlock(
        product({ grams: 1000, price: 73500, price_per_kg: 73500 }),
        en.productCard,
      ),
    ).toEqual({
      perKg: "$73.500",
      reference: "per 1 kg · total $73.500",
    });
  });

  it("returns null when the weight is unknown", () => {
    expect(
      formatPriceBlock(product({ grams: null, price: 106600, price_per_kg: null }), es.productCard),
    ).toBeNull();
    expect(
      formatPriceBlock(product({ grams: null, price: 106600, price_per_kg: 38071 }), es.productCard),
    ).toBeNull();
  });

  it("returns null when the per-kilo price is unknown", () => {
    expect(
      formatPriceBlock(product({ grams: 2800, price: 106600, price_per_kg: null }), en.productCard),
    ).toBeNull();
  });

  it("keeps zero totals and formats negatives with a leading sign", () => {
    expect(formatPriceBlock(product({ grams: 1000, price: 0, price_per_kg: 0 }), es.productCard)).toEqual(
      {
        perKg: "$0",
        reference: "por 1 kg · total $0",
      },
    );
    expect(
      formatPriceBlock(
        product({ grams: 2800, price: -106600, price_per_kg: -38071 }),
        es.productCard,
      ),
    ).toEqual({
      perKg: "-$38.071",
      reference: "por 1 kg · total -$106.600",
    });
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

  it("returns just now for less than a minute in English", () => {
    expect(formatRelativeTime("2026-06-15T11:59:30.000Z", now, "en")).toBe("just now");
    expect(formatRelativeTime("2026-06-15T12:00:30.000Z", now, "en")).toBe("just now");
  });

  it("returns English minutes, hours and days", () => {
    expect(formatRelativeTime("2026-06-15T11:55:00.000Z", now, "en")).toBe("5 min. ago");
    expect(formatRelativeTime("2026-06-15T10:00:00.000Z", now, "en")).toBe("2 hr. ago");
    expect(formatRelativeTime("2026-06-12T12:00:00.000Z", now, "en")).toBe("3 days ago");
    expect(formatRelativeTime("2026-06-15T11:00:00.000Z", now, "en")).toBe("1 hr. ago");
    expect(formatRelativeTime("2026-06-14T12:30:00.000Z", now, "en")).toBe("23 hr. ago");
  });

  it("keeps es as the default locale", () => {
    expect(formatRelativeTime("2026-06-15T11:55:00.000Z", now)).toBe("hace 5 min");
    expect(formatRelativeTime("2026-06-15T11:55:00.000Z", now, "es")).toBe("hace 5 min");
  });
});

describe("JUST_NOW_LABEL", () => {
  it("mirrors the sentinel each locale produces", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    for (const locale of ["es", "en"] as const) {
      expect(formatRelativeTime("2026-06-15T11:59:30.000Z", now, locale)).toBe(
        JUST_NOW_LABEL[locale],
      );
    }
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

describe("bucketGrams", () => {
  const cases: Array<[number, number]> = [
    [60, 100],
    [125, 125],
    [130, 125],
    [175, 125],
    [180, 125],
    [250, 250],
    [400, 500],
    [450, 500],
    [480, 500],
    [600, 500],
    [700, 750],
    [750, 750],
    [900, 750],
    [999, 750],
    [1000, 1000],
    [2500, 2500],
    [5000, 5000],
  ];

  it.each(cases)("maps %i g to %i g", (input, expected) => {
    expect(bucketGrams(input)).toBe(expected);
  });

  it("keeps null grams as null", () => {
    expect(bucketGrams(null)).toBeNull();
  });

  it("resolves ties to the larger bucket", () => {
    expect(bucketGrams(375)).toBe(500);
    expect(bucketGrams(625)).toBe(750);
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
