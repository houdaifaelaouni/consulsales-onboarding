import { describe, expect, it } from "vitest";
import { stagePrice } from "./plans";

describe("stagePrice", () => {
  it("uses the plan price when there is no custom price", () => {
    expect(stagePrice("pro", 2)).toBe(750);
    expect(stagePrice("pro", 2, [null, null, null])).toBe(750);
  });
  it("uses the admin's custom price (cents) for that stage only", () => {
    expect(stagePrice("pro", 2, [null, 60000, null])).toBe(600);
    expect(stagePrice("pro", 3, [null, 60000, null])).toBe(750);
  });
  it("ignores zero or negative prices (a free stage is waived, not priced at 0)", () => {
    expect(stagePrice("starter", 1, [0, null, null])).toBe(300);
  });
});
