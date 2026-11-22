import { describe, expect, it } from "vitest";
import { AGENCY_TIERS, canOpenRoom, isAgencyTier, nextTier, roomsLeft, tierPrice, tierRank } from "./tiers";

describe("agency tiers", () => {
  it("limits rooms per tier: 1 total, then 3, 10, 50 per month", () => {
    expect(AGENCY_TIERS.free).toMatchObject({ roomLimit: 1, period: "total" });
    expect([AGENCY_TIERS.starter, AGENCY_TIERS.growth, AGENCY_TIERS.scale].map((t) => t.roomLimit)).toEqual([3, 10, 50]);
  });
  it("paid tiers have a price and a Whop plan setting; free has neither", () => {
    expect(AGENCY_TIERS.free.monthlyPrice).toBeNull();
    expect(AGENCY_TIERS.free.whopPlanEnv).toBeNull();
    for (const t of [AGENCY_TIERS.starter, AGENCY_TIERS.growth, AGENCY_TIERS.scale]) {
      expect(t.monthlyPrice).toBeGreaterThan(0);
      expect(t.whopPlanEnv).toMatch(/^WHOP_AGENCY_PLAN_/);
    }
  });
  it("white label starts at Growth, multi-brand at Scale", () => {
    expect([AGENCY_TIERS.starter.whiteLabel, AGENCY_TIERS.growth.whiteLabel, AGENCY_TIERS.scale.whiteLabel]).toEqual([false, true, true]);
    expect([AGENCY_TIERS.growth.multiBrand, AGENCY_TIERS.scale.multiBrand]).toEqual([false, true]);
  });
  it("counts rooms left and never goes below zero", () => {
    expect(roomsLeft("starter", 1)).toBe(2);
    expect(roomsLeft("free", 5)).toBe(0);
    expect(canOpenRoom("free", 0)).toBe(true);
    expect(canOpenRoom("free", 1)).toBe(false);
  });
  it("finds the next tier up", () => {
    expect(nextTier("free")).toBe("starter");
    expect(nextTier("scale")).toBeNull();
  });
  it("ranks tiers from free up and prices them", () => {
    expect(["free", "starter", "growth", "scale"].map((t) => tierRank(t as "free"))).toEqual([0, 1, 2, 3]);
    expect([tierPrice("free"), tierPrice("starter"), tierPrice("scale")]).toEqual([0, 49, 299]);
  });
  it("recognises only real tiers", () => {
    expect(isAgencyTier("growth")).toBe(true);
    expect(isAgencyTier("pro")).toBe(false);
    expect(isAgencyTier(undefined)).toBe(false);
  });
});
