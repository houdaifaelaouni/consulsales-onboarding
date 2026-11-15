import { describe, expect, it } from "vitest";
import { hasPaidEntry, mayEnter } from "./entry";

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

describe("mayEnter", () => {
  const now = new Date("2026-11-15T12:00:00Z");
  it("lets a client in during a free trial, and not after", () => {
    expect(mayEnter([], "2026-11-20T00:00:00Z", now)).toBe(true);
    expect(mayEnter([], "2026-11-10T00:00:00Z", now)).toBe(false);
    expect(mayEnter([], null, now)).toBe(false);
  });
  it("a paid or waived stage 1 always opens it", () => {
    expect(mayEnter([{ stage: 1, paid_at: "2026-11-01T00:00:00Z" }], null, now)).toBe(true);
  });
});
