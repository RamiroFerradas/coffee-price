import { describe, expect, it } from "vitest";
import type { RawProduct } from "@/lib/types";
import { enrich, isNonCoffee } from "../enrich";

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

describe("isNonCoffee", () => {
  it("flags the non-coffee junk titles found on MercadoLibre stores", () => {
    expect(isNonCoffee("Leche De Almendras Vegana Amande Sin Tacc 1l X 8 U Fundador")).toBe(true);
    expect(isNonCoffee("Jarabe Syrup Sabor Vainilla Café Martínez Cremuccino 1 L Sin TACC")).toBe(true);
    expect(isNonCoffee("Té Inti Zen Negro en Saquitos Miel Vainilla Cacao 15u")).toBe(true);
    expect(isNonCoffee("Funda Protectora Para Taza Reutilizable")).toBe(true);
    expect(isNonCoffee("Pintura Látex Interior Blanca 1 L")).toBe(true);
    expect(isNonCoffee("Servicio De Molienda A Domicilio")).toBe(true);
  });

  it("keeps coffee listings", () => {
    expect(isNonCoffee("Café De Especialidad En Grano Kenia X 1 Kg - Drupa")).toBe(false);
    expect(isNonCoffee("Café Fundador Elite X Kg En Grano")).toBe(false);
    expect(isNonCoffee("Café Colombia - Brasil - Ristretto - Especialidad. 5 Cuartos")).toBe(false);
  });

  it("keeps equipment listings for the enricher to categorize", () => {
    expect(isNonCoffee("Cápsulas Café Fundador Brasil Comp. Nespresso® X 30 Uni")).toBe(false);
    expect(isNonCoffee("Molino Manual Para Café")).toBe(false);
  });
});

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

  it("falls back to blend when a coffee signal exists but no origin", () => {
    expect(enrich(raw("Café Descafeinado")).category).toBe("blend");
    expect(enrich(raw("Outlet x 1kg")).category).toBe("blend");
    expect(enrich(raw("Café Especial Mr. Wush Wush 01 - Lavado")).category).toBe("blend");
  });

  it("stays null when there is no coffee signal, origin or variety", () => {
    expect(enrich(raw("Francesca")).category).toBeNull();
  });

  it("flags a named variety as single-origin", () => {
    expect(enrich(raw("Bourbon Rojo x 1kg")).category).toBe("single-origin");
  });

  it("classifies real coffees that match neither origin nor variety", () => {
    expect(enrich(raw("Waliki Gesha x 200g")).category).not.toBeNull();
    expect(enrich(raw("SUSCRIPCIÓN CLÁSICA - 1 KG/500 g/750 G")).category).toBe("blend");
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
    expect(enrich(raw("Café molido para filtro V60")).category).toBe("blend");
    expect(enrich(raw("Chemex blend de la casa")).category).toBe("blend");
    expect(enrich(raw("Filtro V60 Colombia")).category).toBe("single-origin");
    expect(enrich(raw("V60 1000 g")).category).toBe("blend");
  });

  it("keeps equipment out of coffee-only categories", () => {
    expect(enrich(raw("Pack 250 grano Brasil")).category).toBe("single-origin");
    expect(enrich(raw("Pack 250 grano Brasil")).grind).toBe("whole-bean");
  });

  it("ignores the coffee signal when a strong keyword matches", () => {
    expect(enrich(raw("Molino para café en grano")).category).toBe("equipment");
  });

  it("hides courses and workshops", () => {
    expect(enrich(raw("Curso Barista Inicial")).category).toBe("equipment");
    expect(enrich(raw("Indigo Curso Control de calidad y calibración de espresso")).category).toBe("equipment");
    expect(enrich(raw("Taller De Texturización y Arte Latte")).category).toBe("equipment");
    expect(enrich(raw("Curso FUNDAMENTOS DEL BARISTA")).category).toBe("equipment");
    expect(enrich(raw("BARISTA INTEGRAL - SÁBADOS")).category).toBe("equipment");
  });

  it("hides merch and non-coffee products", () => {
    expect(enrich(raw("REMERAS ABUELO - OVERSIZE XS")).category).toBe("equipment");
    expect(enrich(raw("TOTE BAG de arpillera reciclada")).category).toBe("equipment");
    expect(enrich(raw("REMERA BUNA")).category).toBe("equipment");
    expect(enrich(raw("LICOR DE CAFE")).category).toBe("equipment");
    expect(enrich(raw("OATLY BARISTA EDITION - LECHE DE AVENA 1 L")).category).toBe("equipment");
    expect(enrich(raw("NUDE BARISTA - LECHE DE AVENA SIN GLUTEN 1LT")).category).toBe("equipment");
  });

  it("hides utensils and brewing accessories even when cafe appears in the name", () => {
    expect(enrich(raw("Jarra de 450 ML")).category).toBe("equipment");
    expect(enrich(raw("PAVA BARISTA P/ CAFE DE ACERO INOXIDABLE CON TERMOMETRO 1.2 L")).category).toBe("equipment");
    expect(enrich(raw("SOPORTE DRIPPER NEGRO")).category).toBe("equipment");
    expect(enrich(raw("PANTALLA PORTAFILTRO")).category).toBe("equipment");
    expect(enrich(raw("Filtro de papel V60 x100")).category).toBe("equipment");
  });

  it("hides gear brands, teas, cleaning and merch from the store audit", () => {
    expect(enrich(raw("URNEX GRINDZ")).category).toBe("equipment");
    expect(enrich(raw("URNEX CAFIZA POWDER")).category).toBe("equipment");
    expect(enrich(raw("PITCHER INOX")).category).toBe("equipment");
    expect(enrich(raw("Pitcher Kettle 600ml")).category).toBe("equipment");
    expect(enrich(raw("SERVER MINIMAL")).category).toBe("equipment");
    expect(enrich(raw("Knock Box")).category).toBe("equipment");
    expect(enrich(raw("Tamping Mat XL")).category).toBe("equipment");
    expect(enrich(raw("DISTRIBUIDOR DE PARTICULAS")).category).toBe("equipment");
    expect(enrich(raw("WDT: Distribuidor de Café")).category).toBe("equipment");
    expect(enrich(raw("Molinillo de café GM1")).category).toBe("equipment");
    expect(enrich(raw("Molinillo Manual Con Regulador Externo")).category).toBe("equipment");
    expect(enrich(raw("Vaso Térmico 320")).category).toBe("equipment");
    expect(enrich(raw("Mug Térmico 360")).category).toBe("equipment");
    expect(enrich(raw("Bolso Premium")).category).toBe("equipment");
    expect(enrich(raw("Gift Card")).category).toBe("equipment");
    expect(enrich(raw("English Breakfast Tea")).category).toBe("equipment");
    expect(enrich(raw("Bai Mu Dan")).category).toBe("equipment");
    expect(enrich(raw("Masala Chai")).category).toBe("equipment");
    expect(enrich(raw("Set de Té")).category).toBe("equipment");
    expect(enrich(raw("Polvo limpiador x 300g")).category).toBe("equipment");
    expect(enrich(raw("Prensa francesa Bodum Brazil")).category).toBe("equipment");
    expect(enrich(raw("Kit Accesorios Para Espresso")).category).toBe("equipment");
    expect(enrich(raw("Filtrados en casa Online")).category).toBe("equipment");
  });

  it("flags DeLonghi and Suono machines as equipment", () => {
    expect(enrich(raw("DeLonghi Dedica + Regalo")).category).toBe("equipment");
    expect(enrich(raw("DeLonghi Espresso Specialista + Regalo")).category).toBe("equipment");
    expect(enrich(raw("DeLonghi Magnifica Start Black + Regalo")).category).toBe("equipment");
    expect(enrich(raw("Suono Atelier Espresso + Regalo")).category).toBe("equipment");
    expect(enrich(raw("Suono Italiana electrica + Regalo")).category).toBe("equipment");
    expect(enrich(raw("Suono Slim + Regalo")).category).toBe("equipment");
  });

  it("flags generic machine and coffee-maker names as equipment", () => {
    expect(enrich(raw("MÁQUINA SUPER AUTOMÁTICA")).category).toBe("equipment");
    expect(enrich(raw("CAFETERA MOKA ITALIANA")).category).toBe("equipment");
  });

  it("keeps real coffees visible", () => {
    expect(enrich(raw("Café Descafeinado")).category).not.toBe("equipment");
    expect(enrich(raw("BOA VISTA 1 kg")).category).not.toBe("equipment");
    expect(enrich(raw("CAJA SET ESPRESSO")).category).not.toBe("equipment");
    expect(enrich(raw("Black Fuel Cold Brew - (Six pack)")).category).not.toBe("equipment");
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
