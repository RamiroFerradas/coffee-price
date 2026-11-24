import { revalidatePath, revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { presentedSecret, secretsMatch } from "@/lib/cron-secret";
import { runScrape } from "@/lib/run-scrape";
import { adaptSupabase, createSupabaseAdmin } from "@/lib/supabase";
import type { StoreId } from "@/lib/types";
import { STORES } from "@/scrapers/stores";

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

export async function GET(request: NextRequest): Promise<Response> {
  const startedAt = Date.now();

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return json({ ok: false, error: "CRON_SECRET is not set on the server." }, 500);
  }
  const presented = presentedSecret(request.headers);
  if (!presented || !secretsMatch(presented, secret)) {
    return json({ ok: false, error: "Unauthorized." }, 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const storeParam = searchParams.get("store");
  const all = searchParams.get("all") === "1";

  let stores: StoreId[] | undefined;
  if (storeParam !== null) {
    const known = STORES.find((store) => store.id === storeParam);
    if (!known) {
      return json({ ok: false, error: `Unknown store: ${storeParam}` }, 400);
    }
    stores = [known.id];
  } else if (all) {
    stores = STORES.map((store) => store.id);
  }

  try {
    const result = await runScrape({
      stores,
      db: adaptSupabase(createSupabaseAdmin()),
      onSynced: () => {
        revalidateTag("products", "max");
        revalidatePath("/");
      },
    });

    const attempted = result.reports.filter((report) => !report.skipped);
    const failed = attempted.filter((report) => !report.ok);
    const status = attempted.length > 0 && failed.length === attempted.length ? 500 : 200;

    return json(
      {
        ok: status === 200,
        syncRan: result.syncRan,
        totalProducts: result.totalProducts,
        reports: result.reports,
        durationMs: Date.now() - startedAt,
      },
      status,
    );
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
}
