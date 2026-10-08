import { decodeEntities } from "./ldjson";

export interface CoffeeSpecs {
  tasting_notes: string | null;
  process: string | null;
  roast_level: string | null;
  altitude: string | null;
  score: number | null;
}

export function emptySpecs(): CoffeeSpecs {
  return {
    tasting_notes: null,
    process: null,
    roast_level: null,
    altitude: null,
    score: null,
  };
}

// Tiendanube nests HTML entities inside JSON-LD (e.g. "&amp;gt;1900 msnm"), so a
// single decode pass still leaves "&gt;" behind; loop until the text stops changing.
function fullyDecode(text: string): string {
  let current = text;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decodeEntities(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

const NOTES_PREFIX = /notas\s+(?:de\s+cata|de|a)?\s*:?\s*/i;
const SENTENCE_END = /[.!?…]/;

export function notesFromText(raw: string): string | null {
  const text = fullyDecode(raw);
  const match = NOTES_PREFIX.exec(text);
  if (!match) return null;
  const rest = text.slice(match.index + match[0].length);
  const end = rest.search(SENTENCE_END);
  const notes = (end >= 0 ? rest.slice(0, end) : rest).trim();
  return notes || null;
}

export function scoreFromText(raw: string): number | null {
  const match = /puntaje\s*:?\s*(\d+(?:[.,]\d+)?)/i.exec(fullyDecode(raw));
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function scoreFromValue(raw: string): number | null {
  const match = /^(\d+(?:[.,]\d+)?)/.exec(fullyDecode(raw).trim());
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

const ROAST_CANONICAL: Record<string, string> = {
  claro: "Claro",
  medio: "Medio",
  oscuro: "Oscuro",
  light: "Claro",
  medium: "Medio",
  dark: "Oscuro",
};

export function roastFromText(raw: string): string | null {
  const match = /\b(?:tueste\s+(claro|medio|oscuro)|(light|medium|dark)\s+roast)\b/i.exec(
    fullyDecode(raw),
  );
  if (!match) return null;
  const token = match[1] ?? match[2];
  return ROAST_CANONICAL[token.toLowerCase()];
}

// Detail-table cells publish the bare value ("Tueste => Medio") without the label.
function normalizeRoast(raw: string): string | null {
  const direct = /^(claro|medio|oscuro|light roast|medium roast|dark roast)$/i.exec(
    fullyDecode(raw).trim(),
  );
  if (direct) return ROAST_CANONICAL[direct[1].toLowerCase()];
  return roastFromText(raw);
}

function titleCase(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1);
}

export function processFromProse(raw: string): string | null {
  const match =
    /\bproceso\s+(?:de\s+(?:beneficio|elaboración)\s+)?([A-Za-zÁÉÍÓÚáéíóúñ]+)/i.exec(
      fullyDecode(raw),
    );
  if (!match) return null;
  return titleCase(match[1].toLowerCase());
}

export function processFromName(name: string): string | null {
  const match = /\s-\s(Lavado|Natural|Honey)\b/i.exec(name);
  if (!match) return null;
  return titleCase(match[1].toLowerCase());
}

export function altitudeFromProse(raw: string): string | null {
  const match = /([<>]?\d[\d.,]*(?:\s*[-–]\s*\d[\d.,]*)?(?:\s*(?:y|a)\s+\d[\d.,]*)?\s*msnm)/i.exec(
    fullyDecode(raw),
  );
  if (!match) return null;
  return match[1].replace(/\s+/g, " ").trim();
}

const STRUCT_LABEL = /\b(NOTAS|ORIGEN|PRODUCTOR|ALTITUD|VARIEDAD|PROCESO)\b/g;

// momo publishes one uppercase-labelled block per product
// ("NOTAS ... ORIGEN ... ALTITUD ... PROCESO ...") inside the JSON-LD description;
// the free-form marketing copy after it is separated by blank space or the
// "..." Tiendanube truncation marker.
export function structuredSpecs(rawDescription: string): CoffeeSpecs {
  const specs = emptySpecs();
  const text = fullyDecode(rawDescription);
  const labels = [...text.matchAll(STRUCT_LABEL)];
  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i];
    const start = (label.index ?? 0) + label[0].length;
    const end = i + 1 < labels.length ? (labels[i + 1].index ?? text.length) : text.length;
    let value = text.slice(start, end);
    const cut = value.search(/\.{3}|\s{2,}/);
    if (cut >= 0) value = value.slice(0, cut);
    value = value.replace(/\s+/g, " ").trim();
    if (!value) continue;
    switch (label[1]) {
      case "NOTAS":
        specs.tasting_notes = value.replace(/\.$/, "");
        break;
      case "PROCESO":
        specs.process = value;
        break;
      case "ALTITUD":
        if (/\d/.test(value)) specs.altitude = value;
        break;
    }
  }
  return specs;
}

function metaDescription(html: string): string | null {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (!/\bname\s*=\s*["']description["']/i.test(tag[0])) continue;
    const content = /\bcontent\s*=\s*["']([\s\S]*?)["']/i.exec(tag[0]);
    if (content) return fullyDecode(content[1]);
  }
  return null;
}

function shortDescriptionText(html: string): string | null {
  const start = html.indexOf("woocommerce-product-details__short-description");
  if (start < 0) return null;
  const open = html.indexOf(">", start);
  if (open < 0) return null;
  const close = html.indexOf("</div>", open);
  if (close < 0) return null;
  const text = html.slice(open + 1, close).replace(/<[^>]+>/g, " ");
  return fullyDecode(text).replace(/\s+/g, " ").trim() || null;
}

function detailTable(html: string): Partial<CoffeeSpecs> {
  const specs: Partial<CoffeeSpecs> = {};
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) =>
      fullyDecode(cell[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(),
    );
    if (cells.length < 2 || !cells[1]) continue;
    const label = cells[0].toLowerCase();
    const value = cells[1];
    if (label.includes("puntaje")) specs.score = scoreFromValue(value);
    else if (label.includes("tueste")) specs.roast_level = normalizeRoast(value);
    else if (label.startsWith("notas")) specs.tasting_notes = value;
    else if (label.includes("proceso")) specs.process = value;
    else if (label.includes("altitud")) specs.altitude = value;
  }
  return specs;
}

function firstValue<T>(candidates: (T | null | undefined)[]): T | null {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) return candidate;
  }
  return null;
}

// flatnwhite detail pages: the spec table wins, then the prose sources fall back
// from the short description to the meta description to the JSON-LD description.
export function specsFromWooDetail(html: string, ldDescription: string | null): CoffeeSpecs {
  const table = detailTable(html);
  const shortDesc = shortDescriptionText(html);
  const meta = metaDescription(html);
  const prose = [shortDesc, meta, ldDescription].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  return {
    score: firstValue([table.score, ...prose.map(scoreFromText)]),
    tasting_notes: firstValue([table.tasting_notes, ...prose.map(notesFromText)]),
    process: firstValue([table.process, ...prose.map(processFromProse)]),
    altitude: firstValue([table.altitude, ...prose.map(altitudeFromProse)]),
    roast_level: firstValue([table.roast_level, ...prose.map(roastFromText)]),
  };
}
