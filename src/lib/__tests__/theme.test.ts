import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, THEMES, isValidTheme, resolveTheme, type ThemeId } from "../theme";

describe("THEMES", () => {
  it("contains exactly the four theme ids in canonical order", () => {
    expect([...THEMES]).toEqual(["classic", "neon", "cyber", "espresso"]);
  });
});

describe("DEFAULT_THEME", () => {
  it("is espresso", () => {
    expect(DEFAULT_THEME).toBe("espresso");
  });
});

describe("isValidTheme", () => {
  it("accepts every declared theme id", () => {
    for (const theme of THEMES) {
      expect(isValidTheme(theme)).toBe(true);
    }
  });

  it("narrows unknown, empty, and non-string values to false", () => {
    expect(isValidTheme("nope")).toBe(false);
    expect(isValidTheme("")).toBe(false);
    expect(isValidTheme("CLASSIC")).toBe(false);
    expect(isValidTheme(null)).toBe(false);
    expect(isValidTheme(undefined)).toBe(false);
    expect(isValidTheme(42)).toBe(false);
    expect(isValidTheme({})).toBe(false);
  });

  it("narrows at the type level", () => {
    const value: unknown = "neon";
    if (isValidTheme(value)) {
      const theme: ThemeId = value;
      expect(theme).toBe("neon");
    } else {
      expect.fail("expected 'neon' to be a valid theme");
    }
  });
});

describe("resolveTheme", () => {
  it("prefers a valid url theme over the stored theme", () => {
    expect(resolveTheme({ urlTheme: "cyber", storedTheme: "neon" })).toBe("cyber");
  });

  it("falls back to the stored theme when the url theme is absent or invalid", () => {
    expect(resolveTheme({ storedTheme: "espresso" })).toBe("espresso");
    expect(resolveTheme({ urlTheme: null, storedTheme: "espresso" })).toBe("espresso");
    expect(resolveTheme({ urlTheme: "bogus", storedTheme: "neon" })).toBe("neon");
    expect(resolveTheme({ urlTheme: "", storedTheme: "neon" })).toBe("neon");
  });

  it("falls back to espresso when neither source is usable", () => {
    expect(resolveTheme({})).toBe("espresso");
    expect(resolveTheme({ urlTheme: null, storedTheme: null })).toBe("espresso");
    expect(resolveTheme({ urlTheme: "bogus", storedTheme: "bogus" })).toBe("espresso");
    expect(resolveTheme()).toBe("espresso");
  });

  it("never throws on hostile input types", () => {
    expect(() =>
      resolveTheme({ urlTheme: 42 as unknown as string, storedTheme: [] as unknown as string }),
    ).not.toThrow();
    expect(resolveTheme({ urlTheme: 42 as unknown as string })).toBe("espresso");
  });
});
