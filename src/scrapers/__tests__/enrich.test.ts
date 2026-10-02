import { describe, expect, it } from "vitest";
import type { RawProduct } from "@/lib/types";
import { enrich } from "../enrich";

function raw(name: string, extra: Partial<RawProduct> = {}): RawProduct {
  return {
    store: "indigoroasters",
    external_id: "x",
    name,
    url: "https://example.com/p",
    roaster: "Indigo",
    price: 1000,
    ...extra,
  };
}

describe("enrich origin", () => {
  it("detects Colombia", () => {
    expect(enrich(raw("Café de Colombia Huila")).origin).toBe("Colombia");
  });

  it("detects Brasil", () => {
    expect(enrich(raw("Espresso Blend Brasil Cerrado")).origin).toBe("Brasil");
  });

  it("detects Etiopía with accent from accented name", () => {
    expect(enrich(raw("Etiopía Yirgacheffe")).origin).toBe("Etiopía");
  });

  it("detects Ethiopia spelled in English", () => {
    expect(enrich(raw("Ethiopia Yirgacheffe Natural")).origin).toBe("Etiopía");
  });

  it("is case-insensitive", () => {
    expect(enrich(raw("ETIOPÍA GUJI")).origin).toBe("Etiopía");
  });

  it("detects Perú accent-insensitively in both spellings", () => {
    expect(enrich(raw("Perú Cajamarca")).origin).toBe("Perú");
    expect(enrich(raw("Peru Cajamarca")).origin).toBe("Perú");
  });

  it("returns first match in list order", () => {
    expect(enrich(raw("Colombia y Brasil blend")).origin).toBe("Colombia");
  });

  it("returns null origin when no country matches", () => {
    expect(enrich(raw("Blend de la Casa")).origin).toBeNull();
  });

  it("does not match country names inside other words", () => {
    expect(enrich(raw("Cafetera India Kit")).origin).toBe("India");
    expect(enrich(raw("Taza Indica")).origin).toBeNull();
  });

  it("keeps an origin already provided by the adapter", () => {
    expect(enrich(raw("Cualquier Cosa", { origin: "Kenya" })).origin).toBe("Kenya");
  });
});

describe("enrich variety", () => {
  it("detects Bourbon", () => {
    expect(enrich(raw("Bourbon Rosado")).variety).toBe("Bourbon");
  });

  it("treats Red/Yellow/Pink Bourbon as Bourbon", () => {
    expect(enrich(raw("Red Bourbon Anaeróbico")).variety).toBe("Bourbon");
    expect(enrich(raw("Yellow Bourbon Lavado")).variety).toBe("Bourbon");
  });

  it("detects Geisha and Gesaya spellings", () => {
    expect(enrich(raw("Geisha Washed")).variety).toBe("Geisha");
    expect(enrich(raw("Gesaya Natural")).variety).toBe("Geisha");
  });

  it("detects Maragogype", () => {
    expect(enrich(raw("Café de Panamá Maragogype Rojo")).variety).toBe("Maragogype");
  });

  it("detects SL-28 and SL-34", () => {
    expect(enrich(raw("Kenia SL-28 Nyeri")).variety).toBe("SL-28");
    expect(enrich(raw("Kenia SL34 Kirinyaga")).variety).toBe("SL-34");
  });

  it("detects Arábica accent-insensitively", () => {
    expect(enrich(raw("Mezcla 100% Arábica")).variety).toBe("Arábica");
    expect(enrich(raw("100% Arabica")).variety).toBe("Arábica");
  });

  it("detects Colombia as varietal", () => {
    expect(enrich(raw("Café Colombia Huila")).variety).toBe("Colombia");
  });

  it("returns null variety when nothing matches", () => {
    expect(enrich(raw("Blend de la Casa")).variety).toBeNull();
  });
});

describe("enrich category", () => {
  it("flags blends even when origins are present", () => {
    const result = enrich(raw("Blend Colombia Brasil"));
    expect(result.category).toBe("blend");
    expect(result.origin).toBe("Colombia");
  });

  it("flags single-origin when an origin is found", () => {
    expect(enrich(raw("Café de Colombia Huila")).category).toBe("single-origin");
  });

  it("returns null category when neither blend nor origin", () => {
    expect(enrich(raw("Café Descafeinado")).category).toBeNull();
  });
});

describe("enrich grind", () => {
  it("flags whole-bean for 'en grano'", () => {
    expect(enrich(raw("Etiopía en Grano")).grind).toBe("whole-bean");
  });

  it("flags whole-bean for 'grano'", () => {
    expect(enrich(raw("Café grano tostado")).grind).toBe("whole-bean");
  });

  it("flags ground for 'molido'", () => {
    expect(enrich(raw("Café molido espresso")).grind).toBe("ground");
  });

  it("flags ground for 'ground'", () => {
    expect(enrich(raw("Ground coffee")).grind).toBe("ground");
  });

  it("does not treat espresso alone as a grind", () => {
    expect(enrich(raw("Blend Espresso")).grind).toBeNull();
  });

  it("returns null grind when no signal", () => {
    expect(enrich(raw("Café de Colombia Huila")).grind).toBeNull();
  });
});

describe("enrich equipment category", () => {
  it("flags strong keywords as equipment", () => {
    expect(enrich(raw("Molino Baratza Encore")).category).toBe("equipment");
    expect(enrich(raw("Máquina espresso Gaggia La Reale")).category).toBe("equipment");
    expect(enrich(raw("Cápsulas Nespresso compatibles")).category).toBe("equipment");
  });

  it("is case-insensitive for strong keywords", () => {
    expect(enrich(raw("MOLINO Eléctrico")).category).toBe("equipment");
    expect(enrich(raw("taza cerámica Bialetti")).category).toBe("equipment");
  });

  it("overrides blend and single-origin when a strong keyword matches", () => {
    expect(enrich(raw("Blend para cafetera italiana")).category).toBe("equipment");
    expect(enrich(raw("Cafetera India Kit")).category).toBe("equipment");
  });

  it("flags weak keywords as equipment when there is no coffee signal", () => {
    expect(enrich(raw("Chemex 6 tazas")).category).toBe("equipment");
    expect(enrich(raw("V60 Hario con filtro de papel")).category).toBe("equipment");
    expect(enrich(raw("Prensa francesa 8 tazas")).category).toBe("equipment");
    expect(enrich(raw("Aeropress Go")).category).toBe("equipment");
    expect(enrich(raw("Fellow Stagg")).category).toBe("equipment");
  });

  it("does not flag weak keywords when the name has a coffee signal", () => {
    expect(enrich(raw("Café molido para filtro V60")).category).toBeNull();
    expect(enrich(raw("Chemex blend de la casa")).category).toBe("blend");
    expect(enrich(raw("Filtro V60 Colombia")).category).toBe("single-origin");
    expect(enrich(raw("V60 1000 g")).category).toBeNull();
  });

  it("keeps equipment out of coffee-only categories", () => {
    expect(enrich(raw("Pack 250 grano Brasil")).category).toBe("single-origin");
    expect(enrich(raw("Pack 250 grano Brasil")).grind).toBe("whole-bean");
  });

  it("ignores the coffee signal when a strong keyword matches", () => {
    expect(enrich(raw("Molino para café en grano")).category).toBe("equipment");
  });
});

describe("enrich preserves other fields", () => {
  it("keeps price, grams, url and fills only name-derived fields", () => {
    const result = enrich(raw("Colombia Bourbon molido 250g", { grams: 250, price: 5000 }));
    expect(result).toMatchObject({
      origin: "Colombia",
      variety: "Bourbon",
      category: "single-origin",
      grind: "ground",
      grams: 250,
      price: 5000,
      name: "Colombia Bourbon molido 250g",
    });
  });
});
