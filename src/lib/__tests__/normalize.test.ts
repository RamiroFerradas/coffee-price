import { describe, expect, it } from "vitest";
import { decodeHtmlEntities } from "../normalize";

describe("decodeHtmlEntities", () => {
  it("decodes numeric entities in decimal and hex", () => {
    expect(decodeHtmlEntities("Bolivia &#8211; 1 KG")).toBe("Bolivia – 1 KG");
    expect(decodeHtmlEntities("Café &#233;")).toBe("Café é");
    expect(decodeHtmlEntities("cafe &#x2013; 250")).toBe("cafe – 250");
  });

  it("decodes the ampersand alias and common named entities", () => {
    expect(decodeHtmlEntities("Blend COLOMBIA &#038; BRASIL")).toBe(
      "Blend COLOMBIA & BRASIL",
    );
    expect(decodeHtmlEntities("a &amp; b &quot;c&quot;")).toBe('a & b "c"');
  });

  it("leaves plain text and unknown entities untouched", () => {
    expect(decodeHtmlEntities("Colombia Tolima – 1KG")).toBe("Colombia Tolima – 1KG");
    expect(decodeHtmlEntities("100% Arabica &amp; more")).toBe("100% Arabica & more");
    expect(decodeHtmlEntities("")).toBe("");
  });
});
