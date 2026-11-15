import { describe, expect, it } from "vitest";
import { back, canContinue, clampStep, DEFAULT_STATE, estimate, lastStep, markDone, next, parseState, remaining, serialize, skip, stepProgress, STEP_IDS, trailStatus, type WelcomeState } from "./logic";

const at = (step: number, over: Partial<WelcomeState> = {}): WelcomeState => ({ ...DEFAULT_STATE, step, ...over });

describe("progress and navigation", () => {
  it("counts the current step as started", () => {
    expect(stepProgress(0)).toBe(20);
    expect(stepProgress(2)).toBe(60);
    expect(stepProgress(lastStep)).toBe(100);
  });
  it("never goes outside the steps", () => {
    expect(clampStep(-3)).toBe(0);
    expect(clampStep(99)).toBe(lastStep);
    expect(clampStep(Number.NaN)).toBe(0);
    expect(next(at(lastStep)).step).toBe(lastStep);
    expect(back(at(0)).step).toBe(0);
  });
  it("moves one step at a time", () => {
    expect(next(at(1)).step).toBe(2);
    expect(back(at(3)).step).toBe(2);
  });
});

describe("estimate", () => {
  it("turns calls, close rate and deal value into clients and revenue", () => {
    expect(estimate({ callsPerMonth: 12, dealValue: 6000, closeRate: 20 })).toEqual({ newClients: 2.4, monthlyRevenue: 14400 });
    expect(estimate({ callsPerMonth: 10, dealValue: 5000, closeRate: 30 })).toEqual({ newClients: 3, monthlyRevenue: 15000 });
  });
  it("is zero when there is no deal value", () => {
    expect(estimate({ callsPerMonth: 20, dealValue: 0, closeRate: 20 }).monthlyRevenue).toBe(0);
  });
});

describe("continue, skip and what is left", () => {
  it("needs a deal value on the goals step, and nothing elsewhere", () => {
    const goals = STEP_IDS.indexOf("goals");
    expect(canContinue(at(goals, { goals: { ...DEFAULT_STATE.goals, dealValue: 0 } }))).toBe(false);
    expect(canContinue(at(goals))).toBe(true);
    expect(canContinue(at(STEP_IDS.indexOf("access")))).toBe(true);
  });
  it("skipping advances and records the step once", () => {
    const s = skip(at(STEP_IDS.indexOf("access")));
    expect(s.step).toBe(STEP_IDS.indexOf("kickoff"));
    expect(s.skipped).toEqual(["access"]);
    expect(skip({ ...s, step: STEP_IDS.indexOf("access") }).skipped).toEqual(["access"]);
  });
  it("cannot skip the final screen", () => {
    expect(skip(at(lastStep))).toEqual(at(lastStep));
  });
  it("doing a skipped step for real removes it from the list", () => {
    expect(markDone(at(0, { skipped: ["access", "kickoff"] }), "kickoff").skipped).toEqual(["access"]);
  });
  it("lists what is still open: later access and an unbooked kickoff", () => {
    expect(remaining(at(4, { access: "seat", kickoff: "2026-11-16T09:00:00Z" }))).toEqual([]);
    expect(remaining(at(4, { access: "later" }))).toEqual(["access", "kickoff"]);
    expect(remaining(at(4, { access: "delegate", kickoff: null }))).toEqual(["kickoff"]);
  });
});

describe("trail", () => {
  it("marks earlier nodes done, the current one, and later ones locked", () => {
    expect([0, 1, 2, 3].map((i) => trailStatus(i, 1))).toEqual(["done", "current", "locked", "locked"]);
  });
});

describe("saved state", () => {
  it("round-trips", () => {
    const s = at(3, { access: "delegate", kickoff: "2026-11-16T09:00:00.000Z", skipped: ["goals"] });
    expect(parseState(serialize(s))).toEqual(s);
  });
  it("falls back to defaults for empty, broken or hostile input", () => {
    expect(parseState(null)).toEqual(DEFAULT_STATE);
    expect(parseState("not json")).toEqual(DEFAULT_STATE);
    expect(parseState('{"step":"x","goals":null,"access":"<script>","kickoff":"nope","skipped":"oops"}')).toEqual(DEFAULT_STATE);
  });
  it("clamps out-of-range numbers and drops unknown values", () => {
    const s = parseState(JSON.stringify({ step: 99, goals: { callsPerMonth: 500, dealValue: -5, closeRate: 77 }, skipped: ["goals", "bogus"] }));
    expect(s.step).toBe(lastStep);
    expect(s.goals).toEqual({ callsPerMonth: 40, dealValue: 0, closeRate: 20 });
    expect(parseState(JSON.stringify({ goals: { dealValue: 0 } })).goals.dealValue).toBe(0);
    expect(s.skipped).toEqual(["goals"]);
  });
});
