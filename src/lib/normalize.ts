const GRAMS_PATTERN =
  /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(kilogramos?|kilograms?|kilos?|kgs?|gramos?|grams?|gramo|grs?|g)\b/i;

export function parseGrams(text: string): number | null {
  const match = GRAMS_PATTERN.exec(text);
  if (!match) return null;

  const rawNumber = match[1];
  const isGrouped = /^\d{1,3}(?:[.,]\d{3})+$/.test(rawNumber);
  const value = isGrouped
    ? Number(rawNumber.replace(/[.,]/g, ""))
    : Number(rawNumber.replace(",", "."));

  const unit = match[2].toLowerCase();
  const multiplier = unit.startsWith("k") ? 1000 : 1;
  return Math.round(value * multiplier);
}

export function parseArsPrice(raw: string | number): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? Math.round(raw) : null;
  }

  const cleaned = raw.replace(/[^0-9.,]/g, "");
  if (!cleaned || !/\d/.test(cleaned)) return null;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  const hasDot = lastDot !== -1;
  const hasComma = lastComma !== -1;

  let value: number;

  if (hasDot && hasComma) {
    const decimalPos = Math.max(lastDot, lastComma);
    const integerPart = cleaned.slice(0, decimalPos).replace(/[.,]/g, "");
    const fractionPart = cleaned.slice(decimalPos + 1);
    value = Number(`${integerPart}.${fractionPart}`);
  } else if (hasComma) {
    const isDecimals = /,\d{2}$/.test(cleaned);
    value = isDecimals ? Number(cleaned.replace(",", ".")) : Number(cleaned.replace(/,/g, ""));
  } else if (hasDot) {
    const isThousands = /^\d{1,3}(?:\.\d{3})+$/.test(cleaned);
    if (isThousands) {
      value = Number(cleaned.replace(/\./g, ""));
    } else {
      const integerPart = cleaned.slice(0, lastDot).replace(/\./g, "");
      const fractionPart = cleaned.slice(lastDot + 1);
      value = Number(`${integerPart}.${fractionPart}`);
    }
  } else {
    value = Number(cleaned);
  }

  if (!Number.isFinite(value)) return null;
  return Math.round(value);
}

export function pricePerKg(price: number, grams: number | null): number | null {
  if (grams == null || grams <= 0) return null;
  if (price <= 0) return null;
  return Math.round((price * 1000) / grams);
}
