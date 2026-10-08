import { describe, expect, it } from "vitest";
import { resolveLocale } from "../negotiate";

describe("resolveLocale", () => {
  it("defaults to es when nothing is provided", () => {
    expect(resolveLocale(null, null)).toBe("es");
    expect(resolveLocale(undefined, undefined)).toBe("es");
    expect(resolveLocale("", "")).toBe("es");
  });

  it("prefers a valid cookie over the Accept-Language header", () => {
    expect(resolveLocale("en-US,en;q=0.9", "es")).toBe("es");
    expect(resolveLocale("es-AR,es;q=0.9", "en")).toBe("en");
    expect(resolveLocale("en", "en")).toBe("en");
  });

  it("matches a supported primary subtag on the cookie", () => {
    expect(resolveLocale("es", "en-GB")).toBe("en");
  });

  it("ignores an unsupported cookie and falls back to the header", () => {
    expect(resolveLocale("en-US,en;q=0.9", "fr")).toBe("en");
    expect(resolveLocale("es-AR", "de")).toBe("es");
    expect(resolveLocale(null, "fr")).toBe("es");
  });

  it("picks the best q-value among supported locales", () => {
    expect(resolveLocale("fr;q=1.0,en;q=0.8,es;q=0.5", null)).toBe("en");
    expect(resolveLocale("es;q=0.4,en;q=0.6", null)).toBe("en");
    expect(resolveLocale("en;q=0.4,es;q=0.6", null)).toBe("es");
  });

  it("keeps header order when q-values tie", () => {
    expect(resolveLocale("en,es", null)).toBe("en");
    expect(resolveLocale("es,en", null)).toBe("es");
    expect(resolveLocale("en;q=0.8,es;q=0.8", null)).toBe("en");
  });

  it("ignores entries rejected with q=0", () => {
    expect(resolveLocale("en;q=0,es;q=0.1", null)).toBe("es");
    expect(resolveLocale("en;q=0", null)).toBe("es");
  });

  it("matches a supported primary subtag from the header", () => {
    expect(resolveLocale("en-GB,en;q=0.9", null)).toBe("en");
    expect(resolveLocale("es-AR,es;q=0.9", null)).toBe("es");
    expect(resolveLocale("en-US", null)).toBe("en");
  });

  it("ignores malformed quality values", () => {
    expect(resolveLocale("en;q=abc,es;q=0.9", null)).toBe("es");
    expect(resolveLocale("es;q=2.5,en;q=0.9", null)).toBe("en");
  });

  it("falls back to the default when no supported language is listed", () => {
    expect(resolveLocale("fr,de;q=0.9", null)).toBe("es");
    expect(resolveLocale("*", null)).toBe("es");
    expect(resolveLocale("pt-BR", null)).toBe("es");
  });
});
