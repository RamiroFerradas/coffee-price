import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`../__fixtures__/${name}`, import.meta.url)), "utf8");
}

export function jsonFixture<T = unknown>(name: string): T {
  return JSON.parse(fixture(name)) as T;
}

export function makeFetch(routes: Record<string, unknown>): (url: string) => Promise<Response> {
  return async (url: string) => {
    const payload = routes[url];
    if (payload !== undefined) {
      const body = typeof payload === "string" ? payload : JSON.stringify(payload);
      return new Response(body, { status: 200 });
    }
    return new Response(JSON.stringify({ code: "not_found" }), { status: 404 });
  };
}
