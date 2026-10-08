import { describe, expect, it } from "vitest";
import { parseArsPrice, parseGrams, pricePerKg } from "./normalize";

describe("parseGrams", () => {
  it("parses '250 gr'", () => {
    expect(parseGrams("250 gr")).toBe(250);
  });

  it("parses '250g' without space", () => {
    expect(parseGrams("250g")).toBe(250);
  });

  it("converts '1 kg' to 1000 grams", () => {
    expect(parseGrams("1 kg")).toBe(1000);
  });

  it("converts '1 kilo' to 1000 grams", () => {
    expect(parseGrams("1 kilo")).toBe(1000);
  });

  it("handles dot thousand separators in '1.000 g'", () => {
    expect(parseGrams("1.000 g")).toBe(1000);
  });

  it("handles comma thousand separators in '1,000 g'", () => {
    expect(parseGrams("1,000 g")).toBe(1000);
  });

  it("parses '500 gramos'", () => {
    expect(parseGrams("500 gramos")).toBe(500);
  });

  it("parses 'Pack 250 Gramos'", () => {
    expect(parseGrams("Pack 250 Gramos")).toBe(250);
  });

  it("parses 'cafe 1kg brasil'", () => {
    expect(parseGrams("cafe 1kg brasil")).toBe(1000);
  });

  it("parses 'Colombia Santander - 250gr'", () => {
    expect(parseGrams("Colombia Santander - 250gr")).toBe(250);
  });

  it("is case-insensitive on the unit", () => {
    expect(parseGrams("250 GR")).toBe(250);
  });

  it("uses the first unit-bearing match", () => {
    expect(parseGrams("Colombia 250g y Brasil 1kg")).toBe(250);
  });

  it("treats '2.500 gr' as 2500 grams", () => {
    expect(parseGrams("2.500 gr")).toBe(2500);
  });

  it("returns null for text without a unit", () => {
    expect(parseGrams("sin azucar")).toBeNull();
  });

  it("returns null for a bare number with no unit", () => {
    expect(parseGrams("250")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseGrams("")).toBeNull();
  });

  it("multiplies a pack count by the listed unit weight", () => {
    expect(parseGrams("Pack X 3 Uds. Café Fundador Amabile Molido X 250 Grs")).toBe(750);
  });

  it("multiplies a trailing pack count after the unit weight", () => {
    expect(parseGrams("Café Indios Verdes Promo Variedades 250 g pack x 5")).toBe(1250);
  });

  // "X Kg" (×1 kg) plus a pack count: 4 × 1 kg.
  it("multiplies a pack count by a bare 'X Kg' unit weight", () => {
    expect(parseGrams("Café Fundador Amabile Molido X Kg - Pack 4 Unidades")).toBe(4000);
  });

  it("treats 'X Kg' in a product name as one kilo", () => {
    expect(parseGrams("Café Fundador Elite X Kg En Grano")).toBe(1000);
  });

  it("keeps 'Doy pack 250 grs.' at 250 grams", () => {
    expect(parseGrams("Colombia Tolima - Doy pack 250 grs.")).toBe(250);
  });

  // Tiendanube names encode the kilo pack without a digit ("…- Pack Kilo").
  it("treats 'Pack Kilo' in a product name as one kilo", () => {
    expect(parseGrams("Colombia Castillo - Pack Kilo")).toBe(1000);
    expect(parseGrams("Colombia Tolima - Pack Kilo")).toBe(1000);
  });

  it("keeps the digit path winning over 'Pack Kilo'", () => {
    expect(parseGrams("Pack 2 Kilos")).toBe(2000);
  });

  it("converts cuartos to quarter-kilos", () => {
    expect(parseGrams("Café Colombia - Brasil - Ristretto - Especialidad. 5 Cuartos")).toBe(1250);
    expect(parseGrams("Promo Variedades! Cuatro Cuartos Kilos! Brasil/colombia")).toBe(1000);
    expect(parseGrams("Promo Degustación! Tres Cuartos Kilos De Café De Brasil!")).toBe(750);
  });

  it("converts spelled-out kilos", () => {
    expect(parseGrams("Café Colombia - Brasil - Café De Especialidad - Tres Kilos!")).toBe(3000);
  });

  it("parses the 'Grms' spelling", () => {
    expect(parseGrams("Café De Costa Rica - Tarrazu - Especialidad - (500 Grms)")).toBe(500);
    expect(parseGrams("Café De Brasil - Sul De Minas (250 Grms)")).toBe(250);
  });

  it("returns null for unlisted size words like '4 Medios'", () => {
    expect(parseGrams("Café Colombia - Brasil - Ristretto - 4 Medios!")).toBeNull();
  });
});

describe("parseArsPrice", () => {
  it("parses a plain decimal string '27800.00'", () => {
    expect(parseArsPrice("27800.00")).toBe(27800);
  });

  it("parses Argentine format '27.800,00'", () => {
    expect(parseArsPrice("27.800,00")).toBe(27800);
  });

  it("strips the currency symbol in '$25.150,00'", () => {
    expect(parseArsPrice("$25.150,00")).toBe(25150);
  });

  it("passes through a numeric input", () => {
    expect(parseArsPrice(27800)).toBe(27800);
  });

  it("treats a lone dot followed by 3 digits as thousands ('19.300')", () => {
    expect(parseArsPrice("19.300")).toBe(19300);
  });

  it("treats a lone comma followed by 3 digits as thousands ('19,300')", () => {
    expect(parseArsPrice("19,300")).toBe(19300);
  });

  it("treats a lone comma followed by 2 digits as decimals", () => {
    expect(parseArsPrice("27,80")).toBe(28);
  });

  it("parses an integer string with no separators", () => {
    expect(parseArsPrice("1234")).toBe(1234);
  });

  it("returns null for non-numeric text", () => {
    expect(parseArsPrice("abc")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseArsPrice("")).toBeNull();
  });
});

describe("pricePerKg", () => {
  it("computes price per kilogram", () => {
    expect(pricePerKg(27800, 250)).toBe(111200);
  });

  it("rounds to the nearest integer", () => {
    expect(pricePerKg(1000, 3)).toBe(333333);
  });

  it("returns null when grams is null", () => {
    expect(pricePerKg(25150, null)).toBeNull();
  });

  it("returns null when grams is 0", () => {
    expect(pricePerKg(25150, 0)).toBeNull();
  });

  it("returns null when grams is negative", () => {
    expect(pricePerKg(25150, -250)).toBeNull();
  });

  it("returns null when price is 0", () => {
    expect(pricePerKg(0, 250)).toBeNull();
  });

  it("returns null when price is negative", () => {
    expect(pricePerKg(-100, 250)).toBeNull();
  });
});
