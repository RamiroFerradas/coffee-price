import { decodeEntities } from "./ldjson";
import { emptySpecs, type CoffeeSpecs } from "./specs.types";

// Tiendanube nests HTML entities inside JSON-LD (e.g. "&amp;gt;1900 msnm"), so a
// single decode pass still leaves "&gt;" behind; loop until the text stops changing.
export function fullyDecode(text: string): string {
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

export function scoreFromValue(raw: string): number | null {
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
export function normalizeRoast(raw: string): string | null {
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

export function firstValue<T>(candidates: (T | null | undefined)[]): T | null {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) return candidate;
  }
  return null;
}
