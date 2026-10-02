import { describe, expect, it, vi } from "vitest";
import { BROWSER_UA, HttpError, delay, fetchText } from "../http";

function response(status: number, body = "ok"): Response {
  return new Response(body, { status });
}

describe("fetchText", () => {
  it("returns the body on success", async () => {
    const fetchFn = vi.fn(async () => response(200, "hello"));
    await expect(fetchText("https://x.test/a", { fetchFn })).resolves.toBe("hello");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("sends a browser user-agent by default", async () => {
    const fetchFn = vi.fn(async () => response(200));
    await fetchText("https://x.test/a", { fetchFn });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://x.test/a");
    expect((init.headers as Record<string, string>)["User-Agent"]).toBe(BROWSER_UA);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("retries twice on 5xx and succeeds", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(500))
      .mockResolvedValueOnce(response(200, "recovered"));
    await expect(
      fetchText("https://x.test/a", { fetchFn, retryDelaysMs: [0, 0] }),
    ).resolves.toBe("recovered");
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("retries on 429", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(response(429))
      .mockResolvedValueOnce(response(200, "later"));
    await expect(
      fetchText("https://x.test/a", { fetchFn, retryDelaysMs: [0] }),
    ).resolves.toBe("later");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("retries on network errors", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(response(200, "recovered"));
    await expect(
      fetchText("https://x.test/a", { fetchFn, retryDelaysMs: [0] }),
    ).resolves.toBe("recovered");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("throws HttpError with the status when retries are exhausted", async () => {
    const fetchFn = vi.fn(async () => response(503, "down"));
    const promise = fetchText("https://x.test/a", { fetchFn, retryDelaysMs: [0, 0] });
    await expect(promise).rejects.toBeInstanceOf(HttpError);
    await expect(promise).rejects.toMatchObject({ status: 503, url: "https://x.test/a" });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 404", async () => {
    const fetchFn = vi.fn(async () => response(404, "missing"));
    await expect(fetchText("https://x.test/a", { fetchFn })).rejects.toMatchObject({
      status: 404,
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("merges extra headers with defaults", async () => {
    const fetchFn = vi.fn(async () => response(200));
    await fetchText("https://x.test/a", {
      fetchFn,
      headers: { Accept: "application/json" },
    });
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Accept"]).toBe("application/json");
    expect(headers["User-Agent"]).toBe(BROWSER_UA);
  });
});

describe("delay", () => {
  it("waits at least the requested time", async () => {
    const start = Date.now();
    await delay(30);
    expect(Date.now() - start).toBeGreaterThanOrEqual(25);
  });
});
