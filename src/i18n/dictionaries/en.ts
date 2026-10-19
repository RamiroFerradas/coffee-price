import type { Dictionary } from "./types";

export const en: Dictionary = {
  meta: {
    title: "Quiero Café — Specialty coffee prices in Argentina",
    description:
      "Compare per-kilo prices of specialty coffee from Argentine roasters: brands, origins and grinds in one place, with data updated daily straight from each roaster's store.",
    keywords: [
      "specialty coffee",
      "coffee per kilo",
      "coffee price per kilo",
      "Argentine roasters",
      "coffee comparator",
      "Colombia coffee",
      "Ethiopia coffee",
      "Brazil coffee",
      "Bolivia coffee",
      "buy specialty coffee Argentina",
    ],
    jsonLd: {
      name: "Quiero Café",
      description:
        "Price comparator for specialty coffee from Argentine roasters, with a comparable price per kilo.",
      inLanguage: "en",
    },
  },
  ticker: {
    roasters: (count) => `${count} roasters`,
    dailyPrices: "prices updated daily",
    comparablePerKg: "comparable price per kilo",
    specialtyBlendsGear: "specialty coffee, blends and equipment",
  },
  hero: {
    eyebrow: "Price comparator",
    description: (count) =>
      `Specialty coffee prices from ${count} Argentine roasters, straight from their stores.`,
  },
  emptyCatalog: {
    title: "No data yet",
    body: "Wait for the next scrape: prices update automatically daily.",
  },
  footer: {
    description:
      "Prices refresh automatically every day, straight from each roaster's store, so you always compare the latest price per kilo.",
    disclaimer:
      "Quiero Café does not sell coffee or process payments. We show public prices from third-party stores, and every purchase link takes you to the roaster's own store.",
    links: {
      about: "About",
      contact: "Contact",
      privacy: "Privacy",
      terms: "Terms",
    },
  },
  trust: {
    about: {
      metaTitle: "About Quiero Café — Independent specialty coffee comparator",
      metaDescription:
        "What Quiero Café is, how it collects and normalizes per-kilo prices, and why it is an independent comparator with no sales or payments.",
      title: "About Quiero Café",
      intro:
        "Quiero Café is an independent specialty coffee price comparator. We bring public prices from Argentine roasters together in one place so you can compare them per kilo.",
      sections: [
        {
          heading: "A comparator, not a store",
          paragraphs: [
            "We do not sell coffee, we have no cart or checkout, and we do not process payments. Our only job is to show you prices and send you to the roaster's store when something catches your eye.",
            "We have no commercial affiliation with the stores we compare: we do not charge sales commissions and we are not paid for placement. Outbound links always go to each roaster's official store.",
          ],
        },
        {
          heading: "How we collect prices",
          paragraphs: [
            "We read the public pages of each roaster's store and update the catalog every day. We do not access private data or wholesale prices.",
            "To compare products with different bag sizes, we normalize the price to a per-kilo value. It is a calculated reference, not the final price charged by the store.",
          ],
        },
        {
          heading: "What to expect",
          paragraphs: [
            "Prices and availability can change between updates. Before buying, confirm the final price, stock and shipping terms on the roaster's store.",
            "If you find an error or want to suggest a roaster, reach out through GitHub: it is our only contact channel.",
          ],
        },
      ],
    },
    contact: {
      metaTitle: "Contact — Quiero Café",
      metaDescription:
        "How to report corrections, request a roaster's removal, or suggest coffee stores for the comparator.",
      title: "Contact",
      intro:
        "For corrections, removal requests or roaster suggestions, use the project's public repository. We have no forms, phone number or address.",
      sections: [
        {
          heading: "GitHub is the only channel",
          paragraphs: [
            "Open an issue in the public repository and tell us what you found. You can also ask us there to remove a store or a product from the catalog.",
            "We use that channel because it leaves a public, verifiable record of every request. We do not invent a contact email or a form we cannot answer.",
          ],
        },
        {
          heading: "What to include in your report",
          paragraphs: [
            "If you report a wrong price, include the product URL and the store. If you request a removal, name the store or product and the reason.",
            "To suggest a roaster, send us the name and address of their store. We check that prices are public and that the catalog can be read without an account.",
          ],
        },
      ],
    },
    privacy: {
      metaTitle: "Privacy — Quiero Café",
      metaDescription:
        "What data Quiero Café uses: no accounts or payments, a functional language cookie, Vercel technical logs, and the public catalog on Supabase.",
      title: "Privacy",
      intro:
        "Quiero Café does not ask for personal data and has no accounts, cart, checkout or payments. This page explains what technical information keeps the site running.",
      sections: [
        {
          heading: "We do not ask for personal data",
          paragraphs: [
            "There is no sign-up, login, newsletter or contact form. We do not request your name, email, phone, address or payment details.",
            "We do not sell coffee or process purchases, so there is no transaction data to store.",
          ],
        },
        {
          heading: "Functional language cookie",
          paragraphs: [
            "We use a cookie called NEXT_LOCALE to remember whether you chose Spanish or English. It is functional: without it, the site would fall back to the language detected by your browser.",
            "We do not use advertising cookies, third-party analytics or cross-site tracking.",
          ],
        },
        {
          heading: "Infrastructure and catalog",
          paragraphs: [
            "The site is hosted on Vercel, which keeps technical request logs (such as IP address and user agent) for security and diagnostics.",
            "The public product catalog is stored in Supabase. It contains product and store information, not user data.",
            "External stores have their own privacy policies. When you follow a purchase link, that site's terms apply.",
          ],
        },
        {
          heading: "No advertising or tracking",
          paragraphs: [
            "We do not show ads or embed social media pixels. We do not share data with third parties for commercial purposes.",
          ],
        },
      ],
    },
    terms: {
      metaTitle: "Terms — Quiero Café",
      metaDescription:
        "Quiero Café terms of use: informational prices, no sales or brokerage, no availability warranty, and verification on the store.",
      title: "Terms",
      intro:
        "These terms explain what information Quiero Café provides and where its limits are. By using the site, you accept these conditions.",
      sections: [
        {
          heading: "Informational, referential prices",
          paragraphs: [
            "The prices we show are informational and referential. They come from public third-party store pages and may be outdated, incomplete or change without notice.",
            "The per-kilo price is a normalization calculation for comparing products with different bag sizes. It is not an offer or the final price charged by the store.",
          ],
        },
        {
          heading: "We do not sell or intermediate",
          paragraphs: [
            "Quiero Café does not sell coffee, process payments or intermediate in any purchase. The commercial relationship is always between you and the roaster's store.",
            "We do not warrant availability, stock, shipping, quality or accuracy of the data. Before buying, verify the price and terms directly on the store.",
          ],
        },
        {
          heading: "Brands, images and content",
          paragraphs: [
            "Brands, trade names, images and descriptions belong to their respective owners and are shown for informational and comparison purposes only.",
            "If you own a store and want content corrected or removed, open an issue on GitHub and we will review it.",
          ],
        },
        {
          heading: "Changes to the site",
          paragraphs: [
            "We may modify, suspend or discontinue the site, its data or these terms at any time. The current version is the one published on this page.",
          ],
        },
      ],
    },
  },
  catalog: {
    sectionAria: "Coffee catalog",
    searchPlaceholder: "Search coffee, origin or roaster…",
    searchAria: "Search products",
    filters: "Filters",
    productOne: "product",
    productMany: "products",
    sortLabel: "Sort by",
    sort: {
      "price_per_kg-desc": "Highest price per kg",
      "price_per_kg-asc": "Lowest price per kg",
      "grams-desc": "Highest weight",
      "grams-asc": "Lowest weight",
      "price-desc": "Highest price",
      "price-asc": "Lowest price",
      "name-asc": "Name (A-Z)",
      "roaster-asc": "Roaster (A-Z)",
    },
    categoryLabel: "Category",
    category: {
      all: "All coffees",
      "single-origin": "Single origin",
      blend: "Blend",
      equipment: "Equipment & accessories",
    },
    originLabel: "Country of origin",
    allCountries: "All countries",
    noWeight: "no weight",
    emptyResults: "No coffees match those filters",
    clearFilters: "Clear filters",
    loadMore: (count) => `Load more (${count})`,
  },
  productCard: {
    category: {
      "single-origin": "Single origin",
      blend: "Blend",
      equipment: "Equipment",
    },
    grind: {
      "whole-bean": "Whole bean",
      ground: "Ground",
    },
    freeShipping: "Free shipping",
    viewOnStore: "View on store",
    perKgRef: "per 1 kg",
    totalLabel: "total",
  },
  updatedBadge: {
    justUpdated: "Just updated",
    updated: (relative) => `Updated ${relative}`,
  },
};
