import { describe, expect, it, vi } from "vitest";
import { STORES } from "@/scrapers/stores";
import {
  SCRAPE_ALL_PATH,
  fanoutScrape,
  handleScrapeAll,
  handleScrapeDaily,
  siteBaseUrl,
} from "@/lib/netlify-cron";

const SECRET = "test-cron-secret";
const BASE = "https://www.quierocafe.shop";
const ENV = { URL: BASE, CRON_SECRET: SECRET };

function respond(status = 200): Response {
  return Response.json({ ok: status < 400 }, { status });
}

function cronRequest(headers: Record<string, string> = {}): Request {
  return new Request(`${BASE}${SCRAPE_ALL_PATH}`, {
    method: "POST",
    headers: { "x-cron-secret": SECRET, ...headers },
  });
}

describe("siteBaseUrl", () => {
  it("prefers URL, strips trailing slashes, and falls back to DEPLOY_PRIME_URL", () => {
    expect(siteBaseUrl({ URL: "https://a.example/" })).toBe("https://a.example");
    expect(siteBaseUrl({ DEPLOY_PRIME_URL: "https://deploy.example" })).toBe(
      "https://deploy.example",
    );
    expect(siteBaseUrl({})).toBeNull();
  });
});

describe("fanoutScrape", () => {
  it("requests every store once through its own scrape route", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return respond();
    });

    const reports = await fanoutScrape({ baseUrl: BASE, secret: SECRET, fetchFn });

    expect(calls.map((call) => call.url)).toEqual(
      STORES.map((store) => `${BASE}/api/scrape?store=${store.id}`),
    );
    expect(
      calls.map(
        (call) => (call.init?.headers as Record<string, string>)["x-cron-secret"],
      ),
    ).toEqual(STORES.map(() => SECRET));
    expect(reports).toHaveLength(STORES.length);
    expect(reports.every((report) => report.ok)).toBe(true);
  });

  it("marks a failing store and keeps scraping the rest", async () => {
    const failing = STORES[0].id;
    const fetchFn = vi.fn(async (url: string) =>
      respond(url.includes(`store=${failing}`) ? 500 : 200),
    );

    const reports = await fanoutScrape({ baseUrl: BASE, secret: SECRET, fetchFn });

    expect(reports.filter((report) => !report.ok)).toEqual([
      { store: failing, ok: false, status: 500 },
    ]);
    expect(fetchFn).toHaveBeenCalledTimes(STORES.length);
  });

  it("records a thrown request as a failed store", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("socket hang up");
    });

    const reports = await fanoutScrape({ baseUrl: BASE, secret: SECRET, fetchFn });

    expect(reports.every((report) => !report.ok)).toBe(true);
    expect(reports[0].error).toBe("socket hang up");
  });
});

describe("handleScrapeAll", () => {
  it("rejects a missing or wrong secret without scraping", async () => {
    const fetchFn = vi.fn(async () => respond());

    const missing = await handleScrapeAll(
      new Request(`${BASE}${SCRAPE_ALL_PATH}`, { method: "POST" }),
      ENV,
      fetchFn,
    );
    const wrong = await handleScrapeAll(
      cronRequest({ "x-cron-secret": "nope" }),
      ENV,
      fetchFn,
    );

    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fails closed when the runtime is not configured", async () => {
    const noSecret = await handleScrapeAll(cronRequest(), { URL: BASE });
    const noUrl = await handleScrapeAll(cronRequest(), { CRON_SECRET: SECRET });

    expect(noSecret.status).toBe(500);
    expect(noUrl.status).toBe(500);
  });

  it("reports success only when every store synced", async () => {
    const ok = await handleScrapeAll(
      cronRequest(),
      ENV,
      vi.fn(async () => respond()),
    );
    const failed = await handleScrapeAll(
      cronRequest(),
      ENV,
      vi.fn(async () => respond(500)),
    );

    expect(ok.status).toBe(200);
    expect((await ok.json()).failed).toBe(0);
    expect(failed.status).toBe(502);
    expect((await failed.json()).failed).toBe(STORES.length);
  });
});

describe("handleScrapeDaily", () => {
  it("hands the run to the background function with the shared secret", async () => {
    const fetchFn = vi.fn(async () => respond(202));

    const response = await handleScrapeDaily(ENV, fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(`${BASE}${SCRAPE_ALL_PATH}`, {
      method: "POST",
      headers: { "x-cron-secret": SECRET },
    });
    expect(response.status).toBe(200);
  });

  it("fails closed when the runtime is not configured", async () => {
    const fetchFn = vi.fn(async () => respond(202));

    const response = await handleScrapeDaily({ URL: BASE }, fetchFn);

    expect(response.status).toBe(500);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
