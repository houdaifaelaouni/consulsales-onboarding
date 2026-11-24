import { describe, expect, it } from "vitest";
import { splitBudget, splitShares } from "./budget";

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

describe("splitShares", () => {
  it("adds back to the total and puts the remainder first", () => {
    expect(splitShares(20, 3)).toEqual([7, 7, 6]);
    expect(splitShares(10, 4)).toEqual([3, 3, 2, 2]);
    expect(splitShares(10, 4).reduce((a, b) => a + b, 0)).toBe(10);
  });
  it("handles no budget and a single profile", () => {
    expect(splitShares(0, 3)).toEqual([0, 0, 0]);
    expect(splitShares(12, 1)).toEqual([12]);
  });
});
