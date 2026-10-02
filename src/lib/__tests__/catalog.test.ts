import { describe, expect, it } from "vitest";
import { isSupabaseConfigured } from "../catalog";

describe("isSupabaseConfigured", () => {
  it("is true when url and service key are present", () => {
    expect(isSupabaseConfigured({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" })).toBe(true);
  });

  it("is false when the url is missing", () => {
    expect(isSupabaseConfigured({ SUPABASE_SERVICE_ROLE_KEY: "k" })).toBe(false);
  });

  it("is false when the service key is missing", () => {
    expect(isSupabaseConfigured({ SUPABASE_URL: "https://x.supabase.co" })).toBe(false);
  });

  it("reads process.env by default", () => {
    expect(isSupabaseConfigured()).toBe(
      Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    );
  });
});
