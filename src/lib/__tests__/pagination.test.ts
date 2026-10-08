import { describe, expect, it } from "vitest";
import { PAGE_SIZE, nextVisibleCount, remainingCount } from "@/lib/pagination";

describe("PAGE_SIZE", () => {
  it("renders 24 items per page", () => {
    expect(PAGE_SIZE).toBe(24);
  });
});

describe("nextVisibleCount", () => {
  it("advances by the step when items remain", () => {
    expect(nextVisibleCount(24, 156, PAGE_SIZE)).toBe(48);
    expect(nextVisibleCount(0, 30, PAGE_SIZE)).toBe(24);
    expect(nextVisibleCount(50, 60, 10)).toBe(60);
  });

  it("caps at the total instead of overshooting", () => {
    expect(nextVisibleCount(48, 55, PAGE_SIZE)).toBe(55);
    expect(nextVisibleCount(24, 25, PAGE_SIZE)).toBe(25);
    expect(nextVisibleCount(55, 55, PAGE_SIZE)).toBe(55);
  });

  it("returns the total when the current count is already at or past it", () => {
    expect(nextVisibleCount(55, 55, PAGE_SIZE)).toBe(55);
    expect(nextVisibleCount(80, 55, PAGE_SIZE)).toBe(55);
    expect(nextVisibleCount(24, 0, PAGE_SIZE)).toBe(0);
  });

  it("returns 0 for an empty catalog", () => {
    expect(nextVisibleCount(0, 0, PAGE_SIZE)).toBe(0);
  });
});

describe("remainingCount", () => {
  it("returns how many items are not yet visible", () => {
    expect(remainingCount(156, 24)).toBe(132);
    expect(remainingCount(30, 0)).toBe(30);
    expect(remainingCount(55, 50)).toBe(5);
  });

  it("clamps at 0 when everything is visible", () => {
    expect(remainingCount(55, 55)).toBe(0);
    expect(remainingCount(55, 80)).toBe(0);
    expect(remainingCount(0, 0)).toBe(0);
  });
});
