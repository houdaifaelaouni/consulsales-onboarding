import { describe, expect, it } from "vitest";
import { oldestBlock, rowsToStates, stateToRow } from "./rows";

describe("access rows", () => {
  it("maps known rows and drops unknown items or statuses", () => {
    expect(rowsToStates([
      { item_id: "crm", status: "connected", blocked_since: null, detail: "HubSpot" },
      { item_id: "linkedin", status: "blocked", blocked_since: "2026-11-01T00:00:00Z", detail: null },
      { item_id: "nope", status: "connected", blocked_since: null, detail: null },
      { item_id: "brand", status: "weird", blocked_since: null, detail: null },
    ])).toEqual({ crm: { status: "connected", detail: "HubSpot" }, linkedin: { status: "blocked", blockedSince: "2026-11-01T00:00:00Z" } });
  });
  it("never sends blocked_since and caps detail", () => {
    const r = stateToRow("w", "crm", { status: "blocked", detail: "x".repeat(900) });
    expect("blocked_since" in r).toBe(false);
    expect(r.detail).toHaveLength(500);
  });
  it("finds the oldest block", () => {
    expect(oldestBlock([{ status: "blocked", blocked_since: "2026-11-05T00:00:00Z" }, { status: "blocked", blocked_since: "2026-11-02T00:00:00Z" }, { status: "connected", blocked_since: null }])).toBe("2026-11-02T00:00:00Z");
    expect(oldestBlock([])).toBeUndefined();
  });
});
