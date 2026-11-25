import { describe, expect, it } from "vitest";
import { splitBudget } from "./budget";

describe("splitBudget", () => {
  it("divides a daily limit across the profiles that share it", () => {
    expect(splitBudget(20, 4)).toBe(5);
    expect(splitBudget(20, 3)).toBe(7); // rounded up, the extra is refused by the hard cap
  });
  it("never returns zero for a real limit, or anything for no limit", () => {
    expect(splitBudget(50, 60)).toBe(1);
    expect(splitBudget(0, 4)).toBe(0);
    expect(splitBudget(-5, 4)).toBe(0);
    expect(splitBudget(20, 0)).toBe(20);
  });
});
