import { STORES } from "../scrapers/stores";
import { presentedSecret, secretsMatch } from "./cron-secret";
import type { StoreId } from "./types";

/**
 * Netlify runtime helpers for the daily scrape.
 *
 * Netlify caps scheduled functions at 30s and synchronous functions at 60s, so the
 * scheduled entry point only triggers a background function, and that background
 * function fans out one short request per store against `/api/scrape`.
 */

export const SCRAPE_ALL_PATH = "/api/scrape-all";

export interface CronEnv {
  URL?: string;
  DEPLOY_PRIME_URL?: string;
  CRON_SECRET?: string;
}

export type CronFetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface StoreSyncReport {
  store: StoreId;
  ok: boolean;
  status?: number;
  error?: string;
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function siteBaseUrl(env: CronEnv): string | null {
  const base = env.URL ?? env.DEPLOY_PRIME_URL;
  if (!base) return null;
  return base.replace(/\/+$/, "");
}

export function isCronAuthorized(
  headers: Headers,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  const presented = presentedSecret(headers);
  return presented !== null && secretsMatch(presented, secret);
}

export async function fanoutScrape(options: {
  baseUrl: string;
  secret: string;
  fetchFn?: CronFetch;
}): Promise<StoreSyncReport[]> {
  const fetchFn = options.fetchFn ?? fetch;
  const reports: StoreSyncReport[] = [];

  for (const store of STORES) {
    try {
      const response = await fetchFn(
        `${options.baseUrl}/api/scrape?store=${store.id}`,
        { headers: { "x-cron-secret": options.secret } },
      );
      reports.push({
        store: store.id,
        ok: response.ok,
        status: response.status,
      });
    } catch (error) {
      reports.push({ store: store.id, ok: false, error: failure(error) });
    }
  }

  return reports;
}

/**
 * Background function body: scrapes every store through one `?store=` request each,
 * so no single invocation has to finish the whole catalog inside the 60s sync limit.
 */
export async function handleScrapeAll(
  request: Request,
  env: CronEnv,
  fetchFn: CronFetch = fetch,
): Promise<Response> {
  const secret = env.CRON_SECRET;
  if (!secret) {
    return json({ ok: false, error: "CRON_SECRET is not set on the server." }, 500);
  }
  if (!isCronAuthorized(request.headers, secret)) {
    return json({ ok: false, error: "Unauthorized." }, 401);
  }

  const baseUrl = siteBaseUrl(env);
  if (!baseUrl) {
    return json({ ok: false, error: "Site URL is not available." }, 500);
  }

  const reports = await fanoutScrape({ baseUrl, secret, fetchFn });
  const failed = reports.filter((report) => !report.ok);
  const status = failed.length === reports.length ? 502 : 200;

  console.log(
    `[scrape-all] stores=${reports.length} failed=${failed.length}`,
  );

  return json(
    {
      ok: failed.length === 0,
      stores: reports.length,
      failed: failed.length,
      reports,
    },
    status,
  );
}

/** Scheduled function body: hands the long scrape to the background function. */
export async function handleScrapeDaily(
  env: CronEnv,
  fetchFn: CronFetch = fetch,
): Promise<Response> {
  const secret = env.CRON_SECRET;
  if (!secret) {
    return json({ ok: false, error: "CRON_SECRET is not set on the server." }, 500);
  }

  const baseUrl = siteBaseUrl(env);
  if (!baseUrl) {
    return json({ ok: false, error: "Site URL is not available." }, 500);
  }

  try {
    const response = await fetchFn(`${baseUrl}${SCRAPE_ALL_PATH}`, {
      method: "POST",
      headers: { "x-cron-secret": secret },
    });
    console.log(`[scrape-daily] POST ${SCRAPE_ALL_PATH} -> ${response.status}`);
    return json(
      { ok: response.ok, status: response.status },
      response.ok ? 200 : 502,
    );
  } catch (error) {
    console.error(`[scrape-daily] POST ${SCRAPE_ALL_PATH} failed: ${failure(error)}`);
    return json({ ok: false, error: failure(error) }, 502);
  }
}
