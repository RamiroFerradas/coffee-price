import { en } from "./en";
import { es } from "./es";
import type { Dictionary } from "./types";
import type { Locale } from "@/i18n/config";

const dictionaries: Record<Locale, Dictionary> = { es, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary } from "./types";
