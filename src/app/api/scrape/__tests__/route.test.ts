import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath, revalidateTag } from "next/cache";
import { GET } from "../route";
import { runScrape } from "@/lib/run-scrape";

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/run-scrape", () => ({
  runScrape: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  adaptSupabase: vi.fn(() => "db"),
  createSupabaseAdmin: vi.fn(() => ({})),
}));

const SECRET = "test-cron-secret";
const originalSecret = process.env.CRON_SECRET;

function scrapeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/scrape?all=1", {
    headers: { "x-cron-secret": SECRET, ...headers },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  vi.mocked(runScrape).mockImplementation(async (options) => {
    options.onSynced?.();
    return {
      syncRan: true,
      totalProducts: 1,
      reports: [
        { store: "indigoroasters", ok: true, count: 1, durationMs: 5 },
      ],
    };
  });
});

afterAll(() => {
  if (originalSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalSecret;
  }
});

describe("GET /api/scrape", () => {
  it("invalidates both the products tag and the home page after a sync", async () => {
    const response = await GET(scrapeRequest());

    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("products", "max");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("rejects requests without the cron secret and touches no cache", async () => {
    const request = new NextRequest("http://localhost/api/scrape?all=1");

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(runScrape).not.toHaveBeenCalled();
  });
});
