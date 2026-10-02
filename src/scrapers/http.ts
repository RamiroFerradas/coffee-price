export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0";

export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_RETRY_DELAYS_MS = [500, 1500] as const;

export interface FetchTextOptions {
  fetchFn?: FetchFn;
  timeoutMs?: number;
  retryDelaysMs?: readonly number[];
  headers?: Record<string, string>;
}

export class HttpError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
  }
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof HttpError) return error.status === 429 || error.status >= 500;
  return true;
}

export async function fetchText(url: string, options: FetchTextOptions = {}): Promise<string> {
  const {
    fetchFn = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
    headers = {},
  } = options;

  const init: RequestInit = {
    headers: { "User-Agent": BROWSER_UA, Accept: "*/*", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    if (attempt > 0) await delay(retryDelaysMs[attempt - 1]);
    try {
      const response = await fetchFn(url, init);
      if (response.ok) return await response.text();
      lastError = new HttpError(`HTTP ${response.status} for ${url}`, response.status, url);
      if (!shouldRetry(lastError)) throw lastError;
    } catch (error) {
      if (error instanceof HttpError && !shouldRetry(error)) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof HttpError
    ? lastError
    : new HttpError(`Request failed for ${url}: ${String(lastError)}`, 0, url);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
