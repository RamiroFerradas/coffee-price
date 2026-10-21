const GRAMS_PATTERN =
  /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(kilogramos?|kilograms?|kilos?|kgs?|gramos?|grams?|grms?|gramo|grs?|g)\b/i;

const PACK_PATTERN =
  /pack\s*[x×]\s*(\d{1,2})\b|pack\s+(\d{1,2})\s*(?:uds|unidades|units?|cajas?)\b/i;

const CUARTOS_PATTERN =
  /(\d{1,2}|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+cuartos?\b/i;

const WORD_KILOS_PATTERN =
  /\b(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+kilos?\b/i;

const PACK_KILO_PATTERN = /\bpack\s+kilos?\b/i;

// "kilos?" alone would miss the "Kg" abbreviation used by MercadoLibre titles.
const X_KG_PATTERN = /\b[x×]\s*(?:kgs?|kilos?)\b/i;

const WORD_NUMBERS: Readonly<Record<string, number>> = {
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
};

function parseUnitGrams(text: string): number | null {
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

function wordCount(token: string): number {
  const word = WORD_NUMBERS[token.toLowerCase()];
  return word ?? Number(token);
}

function baseGrams(text: string): number | null {
  const unit = parseUnitGrams(text);
  if (unit != null) return unit;

  const cuartos = CUARTOS_PATTERN.exec(text);
  if (cuartos) return wordCount(cuartos[1]) * 250;

  const kilos = WORD_KILOS_PATTERN.exec(text);
  if (kilos) return wordCount(kilos[1]) * 1000;

  if (PACK_KILO_PATTERN.test(text)) return 1000;
  if (X_KG_PATTERN.test(text)) return 1000;

  return null;
}

export function parseGrams(text: string): number | null {
  const pack = PACK_PATTERN.exec(text);
  const base = baseGrams(text);
  if (!pack) return base;
  if (base == null) return null;
  return base * wordCount(pack[1] ?? pack[2]);
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

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Decode HTML entities that shops leave raw in product names (e.g.
 * "Bolivia &#8211; 1 KG"). Handles numeric (decimal and hex) and a small
 * set of named entities; unknown entities are left untouched.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  return text.replace(
    /&(?:#x([0-9a-fA-F]+)|#(\d+)|([a-zA-Z]+));/g,
    (match, hex: string | undefined, dec: string | undefined, name: string | undefined) => {
      if (hex !== undefined) {
        const code = Number.parseInt(hex, 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      if (dec !== undefined) {
        const code = Number.parseInt(dec, 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      if (name !== undefined) {
        const key = name.toLowerCase();
        if (key in NAMED_ENTITIES) return NAMED_ENTITIES[key];
      }
      return match;
    },
  );
}
