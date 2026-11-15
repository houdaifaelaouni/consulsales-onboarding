import { describe, expect, it } from "vitest";
import { billingRows, parseEuros } from "./billing";

describe("billingRows", () => {
  it("shows plan and custom prices with each stage's state", () => {
    const rows = billingRows("pro", [null, 60000, null], [
      { stage: 1, paid_at: "2026-11-01T00:00:00Z" },
      { stage: 2, paid_at: null, charge_attempted_at: "2026-11-02T00:00:00Z", charge_error: null },
    ]);
    expect(rows.map((r) => r.status)).toEqual(["paid", "charging", "not_billed"]);
    expect(rows[1]).toMatchObject({ planCents: 75000, priceCents: 60000, custom: true, locked: true });
    expect(rows[2]).toMatchObject({ priceCents: 75000, custom: false, locked: false });
  });
  it("a waived stage is locked, a failed charge is not", () => {
    const rows = billingRows("starter", null, [
      { stage: 1, paid_at: "2026-11-01T00:00:00Z", waived: true },
      { stage: 2, paid_at: null, charge_attempted_at: "2026-11-02T00:00:00Z", charge_error: "card_declined" },
    ]);
    expect(rows[0]).toMatchObject({ status: "waived", locked: true });
    expect(rows[1]).toMatchObject({ status: "billed", locked: false });
  });
});

describe("parseEuros", () => {
  it("reads euros with a dot or a comma", () => {
    expect(parseEuros("600")).toBe(60000);
    expect(parseEuros(" 600,50 ")).toBe(60050);
  });
  it("refuses empty, zero, negative or silly amounts", () => {
    for (const bad of ["", "0", "-5", "abc", "100001"]) expect(parseEuros(bad)).toBeNull();
  });
});
