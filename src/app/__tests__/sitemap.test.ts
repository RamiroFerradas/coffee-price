import { describe, expect, it } from "vitest";
import sitemap from "../sitemap";
import { SITE_URL } from "@/i18n/metadata";

describe("sitemap", () => {
  it("lists every localized route once", () => {
    const entries = sitemap();

    expect(entries).toHaveLength(10);

    const urls = entries.map((entry) => entry.url);
    for (const locale of ["es", "en"]) {
      for (const path of ["", "about", "contact", "privacy", "terms"]) {
        const suffix = path ? `/${path}` : "";
        expect(urls).toContain(`${SITE_URL}/${locale}${suffix}`);
      }
    }
  });
});
