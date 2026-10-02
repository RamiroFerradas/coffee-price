import { describe, expect, it } from "vitest";
import type { RawProduct } from "@/lib/types";
import {
  absoluteUrl,
  collectProducts,
  decodeEntities,
  dedupeByExternalId,
  extractLdJsonBlocks,
  firstImageUrl,
  gramsFromWeight,
  inStockFromAvailability,
} from "../ldjson";

describe("extractLdJsonBlocks", () => {
  it("parses every strict JSON ld+json block", () => {
    const html = `
      <script type="application/ld+json">{"@type":"Organization"}</script>
      <script type='application/ld+json'>{"@type":"Product","name":"A"}</script>`;
    expect(extractLdJsonBlocks(html)).toHaveLength(2);
  });

  it("skips blocks that are not strict JSON", () => {
    const html = `
      <script type="application/ld+json">{not json}</script>
      <script type="application/ld+json">{"@type":"Product","name":"A"}</script>`;
    const blocks = extractLdJsonBlocks(html);
    expect(blocks).toHaveLength(1);
    expect((blocks[0] as { name: string }).name).toBe("A");
  });

  it("returns an empty list when there are no blocks", () => {
    expect(extractLdJsonBlocks("<html><body>nothing</body></html>")).toEqual([]);
  });
});

describe("collectProducts", () => {
  it("collects a standalone Product block", () => {
    const products = collectProducts([{ "@type": "Product", name: "A" }]);
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe("A");
  });

  it("collects Products inside an @graph", () => {
    const products = collectProducts([
      {
        "@graph": [
          { "@type": "WebPage" },
          { "@type": ["Product", "Thing"], name: "B" },
        ],
      },
    ]);
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe("B");
  });

  it("collects Products from an ItemList", () => {
    const products = collectProducts([
      {
        "@type": "ItemList",
        itemListElement: [
          { "@type": "ListItem", position: 1, item: { "@type": "Product", name: "C" } },
          { "@type": "ListItem", position: 2, item: { "@type": "Product", name: "D" } },
        ],
      },
    ]);
    expect(products.map((p) => p.name)).toEqual(["C", "D"]);
  });

  it("ignores non-product blocks", () => {
    expect(collectProducts([{ "@type": "Organization", name: "X" }])).toEqual([]);
  });
});

describe("gramsFromWeight", () => {
  it("converts KGM values to grams", () => {
    expect(gramsFromWeight({ "@type": "QuantitativeValue", unitCode: "KGM", value: "0.25" })).toBe(250);
    expect(gramsFromWeight({ "@type": "QuantitativeValue", unitCode: "KGM", value: "1" })).toBe(1000);
    expect(gramsFromWeight({ "@type": "QuantitativeValue", unitCode: "KGM", value: 0.05 })).toBe(50);
  });

  it("reads GRM and G91 values directly as grams", () => {
    expect(gramsFromWeight({ unitCode: "GRM", value: "250" })).toBe(250);
    expect(gramsFromWeight({ unitCode: "G91", value: "500" })).toBe(500);
  });

  it("returns null when weight is missing or unusable", () => {
    expect(gramsFromWeight(undefined)).toBeNull();
    expect(gramsFromWeight(null)).toBeNull();
    expect(gramsFromWeight({ unitCode: "KGM", value: "n/a" })).toBeNull();
    expect(gramsFromWeight({ value: "0.25" })).toBeNull();
  });
});

describe("inStockFromAvailability", () => {
  it("maps schema.org availability to booleans", () => {
    expect(inStockFromAvailability("https://schema.org/InStock")).toBe(true);
    expect(inStockFromAvailability("http://schema.org/InStock")).toBe(true);
    expect(inStockFromAvailability("https://schema.org/OutOfStock")).toBe(false);
    expect(inStockFromAvailability(undefined)).toBe(true);
  });
});

describe("absoluteUrl", () => {
  it("keeps absolute https urls", () => {
    expect(absoluteUrl("https://a.test/x", "https://b.test")).toBe("https://a.test/x");
  });

  it("forces https on protocol-relative urls", () => {
    expect(absoluteUrl("//cdn.test/x.webp", "https://store.test/productos/")).toBe(
      "https://cdn.test/x.webp",
    );
  });

  it("resolves root-relative urls against the base", () => {
    expect(absoluteUrl("/productos/cafe/", "https://store.test/otros/")).toBe(
      "https://store.test/productos/cafe/",
    );
  });

  it("returns null for empty input", () => {
    expect(absoluteUrl("", "https://store.test")).toBeNull();
    expect(absoluteUrl(undefined, "https://store.test")).toBeNull();
  });
});

describe("firstImageUrl", () => {
  it("handles a plain string", () => {
    expect(firstImageUrl("https://cdn.test/a.webp")).toBe("https://cdn.test/a.webp");
  });

  it("handles an array of strings", () => {
    expect(firstImageUrl(["https://cdn.test/a.webp", "https://cdn.test/b.webp"])).toBe(
      "https://cdn.test/a.webp",
    );
  });

  it("handles an array of ImageObject entries", () => {
    expect(firstImageUrl([{ "@type": "ImageObject", url: "https://cdn.test/a.webp" }])).toBe(
      "https://cdn.test/a.webp",
    );
  });

  it("forces https on protocol-relative images", () => {
    expect(firstImageUrl("//acdn.test/a.webp", "https://store.test/")).toBe(
      "https://acdn.test/a.webp",
    );
  });

  it("returns null when there is no image", () => {
    expect(firstImageUrl(undefined)).toBeNull();
    expect(firstImageUrl([])).toBeNull();
    expect(firstImageUrl([{ "@type": "ImageObject" }])).toBeNull();
  });
});

describe("decodeEntities", () => {
  it("decodes common named entities", () => {
    expect(decodeEntities("flat&amp;white &quot;x&quot;")).toBe('flat&white "x"');
    expect(decodeEntities("it&#039;s")).toBe("it's");
  });

  it("decodes numeric entities", () => {
    expect(decodeEntities("Caf&#233;")).toBe("Café");
  });

  it("leaves plain text untouched", () => {
    expect(decodeEntities("Etiopía Yirgacheffe")).toBe("Etiopía Yirgacheffe");
  });
});

describe("dedupeByExternalId", () => {
  it("keeps the first occurrence per external_id", () => {
    const make = (id: string, price: number): RawProduct => ({
      store: "indigoroasters",
      external_id: id,
      name: id,
      url: "https://x.test",
      roaster: "Indigo",
      price,
    });
    const result = dedupeByExternalId([make("a", 1), make("b", 2), make("a", 3)]);
    expect(result).toHaveLength(2);
    expect(result[0].price).toBe(1);
    expect(result[1].price).toBe(2);
  });
});
