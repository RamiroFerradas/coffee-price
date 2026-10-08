import { describe, expect, it } from "vitest";
import { dueStores, getLastSyncedMap } from "@/lib/refresh";

const NOW = new Date("2026-01-15T12:00:00.000Z");

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60_000);
}

describe("dueStores", () => {
  it("marks every store due when nothing has been synced yet", () => {
    expect(dueStores(NOW, {}).map((store) => store.id).sort()).toEqual([
      "bunatostadores",
      "cafedelirante",
      "drupa",
      "flatnwhite",
      "fuegotostadores",
      "indigoroasters",
      "indiosverdes",
      "johnandjoe",
      "kapselmaker",
      "modobarista",
      "momotostadores",
    ]);
  });

  it("skips a store synced inside its refresh window", () => {
    const due = dueStores(NOW, { cafedelirante: minutesAgo(30) });
    expect(due.some((store) => store.id === "cafedelirante")).toBe(false);
  });

  it("includes a store once its refresh window has elapsed", () => {
    const due = dueStores(NOW, { cafedelirante: minutesAgo(60) });
    expect(due.some((store) => store.id === "cafedelirante")).toBe(true);
  });

  it("honours each store's own refreshMinutes", () => {
    const due = dueStores(NOW, {
      flatnwhite: minutesAgo(90),
      indigoroasters: minutesAgo(90),
    });
    expect(due.some((store) => store.id === "indigoroasters")).toBe(true);
    expect(due.some((store) => store.id === "flatnwhite")).toBe(false);
  });

  it("keeps stores without a last-sync entry alongside due ones", () => {
    const due = dueStores(NOW, { momotostadores: minutesAgo(5) });
    expect(due.map((store) => store.id)).toContain("bunatostadores");
    expect(due.map((store) => store.id)).not.toContain("momotostadores");
  });
});

describe("getLastSyncedMap", () => {
  it("keeps the latest row per store", () => {
    const map = getLastSyncedMap([
      { store: "cafedelirante", fetched_at: "2026-01-15T10:00:00.000Z" },
      { store: "bunatostadores", fetched_at: "2026-01-15T09:00:00.000Z" },
      { store: "cafedelirante", fetched_at: "2026-01-15T11:00:00.000Z" },
    ]);
    expect(map.cafedelirante).toEqual(new Date("2026-01-15T11:00:00.000Z"));
    expect(map.bunatostadores).toEqual(new Date("2026-01-15T09:00:00.000Z"));
  });

  it("picks the newest timestamp even when rows arrive unsorted", () => {
    const map = getLastSyncedMap([
      { store: "indigoroasters", fetched_at: "2026-01-15T08:00:00.000Z" },
      { store: "indigoroasters", fetched_at: "2026-01-15T10:30:00.000Z" },
    ]);
    expect(map.indigoroasters).toEqual(new Date("2026-01-15T10:30:00.000Z"));
  });

  it("returns an empty map for no rows", () => {
    expect(getLastSyncedMap([])).toEqual({});
  });
});
