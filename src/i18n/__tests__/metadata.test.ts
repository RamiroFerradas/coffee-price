import { describe, expect, it } from "vitest";
import { SITE_URL, buildMetadata, buildPageMetadata } from "../metadata";

describe("buildPageMetadata", () => {
  it("builds localized metadata for an ES trust page", () => {
    const metadata = buildPageMetadata(
      "es",
      "about",
      "Sobre Quiero Café",
      "Un comparador independiente de precios de café.",
    );

    expect(metadata.title).toBe("Sobre Quiero Café");
    expect(metadata.description).toBe(
      "Un comparador independiente de precios de café.",
    );
    expect(metadata.alternates?.canonical).toBe("/es/about");
    expect(metadata.alternates?.languages).toEqual({
      es: "/es/about",
      en: "/en/about",
      "x-default": "/es/about",
    });
    expect(metadata.openGraph?.url).toBe(`${SITE_URL}/es/about`);
  });

  it("builds localized metadata for an EN trust page", () => {
    const metadata = buildPageMetadata(
      "en",
      "privacy",
      "Privacy",
      "How this site handles data.",
    );

    expect(metadata.title).toBe("Privacy");
    expect(metadata.description).toBe("How this site handles data.");
    expect(metadata.alternates?.canonical).toBe("/en/privacy");
    expect(metadata.alternates?.languages).toEqual({
      es: "/es/privacy",
      en: "/en/privacy",
      "x-default": "/es/privacy",
    });
    expect(metadata.openGraph?.url).toBe(`${SITE_URL}/en/privacy`);
  });

  it("preserves the home metadata alternates and openGraph URL", () => {
    const esMetadata = buildMetadata("es");
    expect(esMetadata.alternates?.canonical).toBe("/es");
    expect(esMetadata.alternates?.languages).toEqual({
      es: "/es",
      en: "/en",
      "x-default": "/es",
    });
    expect(esMetadata.openGraph?.url).toBe(SITE_URL);

    const enMetadata = buildMetadata("en");
    expect(enMetadata.alternates?.canonical).toBe("/en");
    expect(enMetadata.alternates?.languages).toEqual({
      es: "/es",
      en: "/en",
      "x-default": "/es",
    });
    expect(enMetadata.openGraph?.url).toBe(SITE_URL);
  });
});
