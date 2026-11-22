import { describe, expect, it } from "vitest";
import { checkUpgrade, upgradeOptions } from "./upgrade";

const env = { WHOP_AGENCY_PLAN_STARTER: "plan_as", WHOP_AGENCY_PLAN_GROWTH: " plan_ag ", WHOP_AGENCY_PLAN_SCALE: "" };

describe("upgradeOptions", () => {
  it("lists only tiers above the current one", () => {
    expect(upgradeOptions("free")).toEqual(["starter", "growth", "scale"]);
    expect(upgradeOptions("growth")).toEqual(["scale"]);
    expect(upgradeOptions("scale")).toEqual([]);
  });
});

describe("checkUpgrade", () => {
  it("lets an owner buy a higher tier and returns its Whop plan", () => {
    expect(checkUpgrade({ current: "free", requested: "growth", role: "owner", env })).toEqual({ ok: true, tier: "growth", planId: "plan_ag" });
  });
  it("refuses anyone who is not an owner", () => {
    expect(checkUpgrade({ current: "free", requested: "growth", role: "member", env })).toEqual({ ok: false, reason: "forbidden" });
    expect(checkUpgrade({ current: "free", requested: "growth", role: null, env })).toEqual({ ok: false, reason: "forbidden" });
  });
  it("refuses the same tier, a lower tier, free, and made-up tiers", () => {
    for (const requested of ["starter", "free", "pro", undefined, 3]) {
      expect(checkUpgrade({ current: "starter", requested, role: "owner", env })).toEqual({ ok: false, reason: "not_upgrade" });
    }
  });
  it("reports unavailable when the Whop plan is not set", () => {
    expect(checkUpgrade({ current: "free", requested: "scale", role: "owner", env })).toEqual({ ok: false, reason: "unavailable" });
    expect(checkUpgrade({ current: "free", requested: "starter", role: "owner", env: {} })).toEqual({ ok: false, reason: "unavailable" });
  });
});
