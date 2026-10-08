import { defaultLocale, matchLocale, type Locale } from "./config";

interface LanguageRange {
  tag: string;
  quality: number;
}

/** Parse an Accept-Language header into ordered ranges, dropping entries whose
 * quality is missing-but-malformed or explicitly rejected (q=0 / out of range). */
function parseAcceptLanguage(value: string): LanguageRange[] {
  const ranges: LanguageRange[] = [];
  for (const part of value.split(",")) {
    const [rawTag, ...params] = part.trim().split(";");
    const tag = rawTag.trim().toLowerCase();
    if (!tag) continue;

    let quality = 1;
    if (params.length > 0) {
      const qParam = params.find((param) => param.trim().toLowerCase().startsWith("q="));
      if (qParam) {
        const parsed = Number(qParam.trim().slice(2).trim());
        if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) continue;
        quality = parsed;
      }
    }
    ranges.push({ tag, quality });
  }
  return ranges;
}

export function resolveLocale(
  acceptLanguage: string | null | undefined,
  cookieLocale: string | null | undefined,
): Locale {
  const fromCookie = matchLocale(cookieLocale);
  if (fromCookie) return fromCookie;

  if (acceptLanguage) {
    let best: { locale: Locale; quality: number } | null = null;
    for (const range of parseAcceptLanguage(acceptLanguage)) {
      const locale = matchLocale(range.tag);
      if (!locale) continue;
      if (!best || range.quality > best.quality) best = { locale, quality: range.quality };
    }
    if (best) return best.locale;
  }

  return defaultLocale;
}
