import type { RawProduct } from "@/lib/types";
import { parseGrams } from "@/lib/normalize";
import {
  COFFEE_SIGNAL,
  NON_COFFEE,
  ORIGINS,
  STRONG_EQUIPMENT,
  VARIETIES,
  WEAK_EQUIPMENT,
} from "./enrich.data";

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function isNonCoffee(name: string): boolean {
  return NON_COFFEE.some((pattern) => pattern.test(normalize(name)));
}

function firstMatch(
  haystack: string,
  entries: ReadonlyArray<readonly [string, string]>,
): string | null {
  for (const [needle, canonical] of entries) {
    if (new RegExp(`\\b${needle}\\b`).test(haystack)) return canonical;
  }
  return null;
}

export function enrich(raw: RawProduct): RawProduct {
  const normalized = normalize(raw.name);

  const origin = raw.origin ?? firstMatch(normalized, ORIGINS);
  const variety = raw.variety ?? firstMatch(normalized, VARIETIES);

  let grind = raw.grind ?? null;
  if (grind == null) {
    if (/grano|whole bean|en grano/i.test(raw.name)) grind = "whole-bean";
    else if (/molido|ground/i.test(raw.name)) grind = "ground";
  }

  const strongEquipment = STRONG_EQUIPMENT.some((keyword) =>
    new RegExp(`\\b${keyword}s?\\b`).test(normalized),
  );
  const weakEquipment = WEAK_EQUIPMENT.some((keyword) =>
    new RegExp(`\\b${keyword}s?\\b`).test(normalized),
  );
  const coffeeSignal =
    COFFEE_SIGNAL.test(normalized) ||
    firstMatch(normalized, ORIGINS) !== null ||
    parseGrams(raw.name) !== null;

  const nonCoffee = isNonCoffee(raw.name);
  const isEquipment = nonCoffee || strongEquipment || (weakEquipment && !coffeeSignal);

  let category = raw.category ?? null;
  if (category == null && !isEquipment) {
    if (/\bblend\b/i.test(raw.name)) category = "blend";
    else if (origin) category = "single-origin";
    else if (variety) category = "single-origin";
    else if (coffeeSignal) category = "blend";
  }
  if (isEquipment) category = "equipment";

  return { ...raw, origin, variety, category, grind };
}
