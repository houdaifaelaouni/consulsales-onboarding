import { describe, expect, it } from "vitest";
import { hasPaidEntry } from "./entry";

describe("hasPaidEntry", () => {
  it("needs stage 1 paid", () => {
    expect(hasPaidEntry([{ stage: 1, paid_at: "2026-11-15T00:00:00Z" }])).toBe(true);
    expect(hasPaidEntry([{ stage: 1, paid_at: null }])).toBe(false);
  });
  it("ignores later stages and missing rows", () => {
    expect(hasPaidEntry([{ stage: 2, paid_at: "2026-11-15T00:00:00Z" }])).toBe(false);
    expect(hasPaidEntry([])).toBe(false);
    expect(hasPaidEntry(null)).toBe(false);
  });
});
