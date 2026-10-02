import type { RawProduct } from "@/lib/types";
import { parseGrams } from "@/lib/normalize";

const ORIGINS: ReadonlyArray<readonly [string, string]> = [
  ["colombia", "Colombia"],
  ["brasil", "Brasil"],
  ["brazil", "Brasil"],
  ["etiopia", "Etiopía"],
  ["ethiopia", "Etiopía"],
  ["guatemala", "Guatemala"],
  ["kenia", "Kenia"],
  ["kenya", "Kenia"],
  ["ruanda", "Ruanda"],
  ["rwanda", "Ruanda"],
  ["peru", "Perú"],
  ["bolivia", "Bolivia"],
  ["mexico", "México"],
  ["honduras", "Honduras"],
  ["sumatra", "Sumatra"],
  ["indonesia", "Indonesia"],
  ["india", "India"],
  ["costa rica", "Costa Rica"],
  ["el salvador", "El Salvador"],
  ["nicaragua", "Nicaragua"],
  ["panama", "Panamá"],
  ["china", "China"],
  ["vietnam", "Vietnam"],
  ["yemen", "Yemen"],
  ["puerto rico", "Puerto Rico"],
  ["republica dominicana", "República Dominicana"],
  ["camerun", "Camerún"],
  ["uganda", "Uganda"],
  ["tanzania", "Tanzania"],
  ["angola", "Angola"],
  ["madagascar", "Madagascar"],
];

const VARIETIES: ReadonlyArray<readonly [string, string]> = [
  ["bourbon", "Bourbon"],
  ["caturra", "Caturra"],
  ["typica", "Typica"],
  ["geisha", "Geisha"],
  ["gesaya", "Geisha"],
  ["maragogype", "Maragogype"],
  ["pacamara", "Pacamara"],
  ["catuai", "Catuai"],
  ["mundo novo", "Mundo Novo"],
  ["arabica", "Arábica"],
  ["robusta", "Robusta"],
  ["castillo", "Castillo"],
  ["colombia", "Colombia"],
  ["sl-28", "SL-28"],
  ["sl 28", "SL-28"],
  ["sl28", "SL-28"],
  ["sl-34", "SL-34"],
  ["sl 34", "SL-34"],
  ["sl34", "SL-34"],
  ["heirloom", "Heirloom"],
];

const STRONG_EQUIPMENT = [
  "molino",
  "cafetera",
  "maquina",
  "moka",
  "taza",
  "balanza",
  "tamper",
  "capsula",
  "gaggia",
  "breville",
  "baratza",
  "bialetti",
  "nespresso",
];

const WEAK_EQUIPMENT = [
  "v60",
  "chemex",
  "aeropress",
  "prensa francesa",
  "hario",
  "kalita",
  "fellow",
  "filtro",
];

const COFFEE_SIGNAL = /caf[ée]|blend|grano|molido/;

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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

  let category = raw.category ?? null;
  if (category == null) {
    if (/\bblend\b/i.test(raw.name)) category = "blend";
    else if (origin) category = "single-origin";
  }

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

  if (strongEquipment || (weakEquipment && !coffeeSignal)) {
    category = "equipment";
  }

  return { ...raw, origin, variety, category, grind };
}
