import {
  altitudeFromProse,
  firstValue,
  fullyDecode,
  normalizeRoast,
  notesFromText,
  processFromProse,
  roastFromText,
  scoreFromText,
  scoreFromValue,
} from "./specs.text";
import type { CoffeeSpecs } from "./specs.types";

export { emptySpecs } from "./specs.types";
export type { CoffeeSpecs } from "./specs.types";
export {
  altitudeFromProse,
  notesFromText,
  processFromName,
  processFromProse,
  roastFromText,
  scoreFromText,
  structuredSpecs,
} from "./specs.text";

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
