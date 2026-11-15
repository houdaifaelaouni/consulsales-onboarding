import { describe, expect, it } from "vitest";
import { completedStages, dayOfJourney, firstName, groupByStage, nextTask, progress, type HomeTask } from "./home";

const task = (type: string, status: HomeTask["status"] = "todo", dueAt: string | null = null): HomeTask => ({
  id: type, type, status, dueAt,
});

describe("dayOfJourney", () => {
  it("is day 1 on the start date and counts up", () => {
    expect(dayOfJourney("2026-11-10", new Date("2026-11-10T09:00:00Z"))).toBe(1);
    expect(dayOfJourney("2026-11-10", new Date("2026-11-12T23:59:00Z"))).toBe(3);
  });
  it("never goes below 1 for a future start date", () => {
    expect(dayOfJourney("2026-12-01", new Date("2026-11-10T00:00:00Z"))).toBe(1);
  });
});

describe("nextTask", () => {
  it("returns the earliest-due open task", () => {
    const t = [task("a", "todo", "2026-11-20T00:00:00Z"), task("b", "todo", "2026-11-12T00:00:00Z"), task("c", "done", "2026-11-01T00:00:00Z")];
    expect(nextTask(t)?.type).toBe("b");
  });
  it("prefers a workable task over a blocked one", () => {
    const t = [task("blocked_one", "blocked", "2026-11-01T00:00:00Z"), task("ok", "todo", "2026-11-30T00:00:00Z")];
    expect(nextTask(t)?.type).toBe("ok");
  });
  it("falls back to a blocked task when nothing else is open", () => {
    expect(nextTask([task("x", "blocked"), task("y", "done")])?.type).toBe("x");
  });
  it("returns null when everything is done or there are no tasks", () => {
    expect(nextTask([task("x", "done")])).toBeNull();
    expect(nextTask([])).toBeNull();
  });
});

describe("stages and progress", () => {
  it("groups tasks by stage with unknown types in stage 1", () => {
    const g = groupByStage([task("approve_profile"), task("book_kickoff"), task("mystery")]);
    expect(g[1].map((t) => t.type).sort()).toEqual(["book_kickoff", "mystery"]);
    expect(g[2].map((t) => t.type)).toEqual(["approve_profile"]);
  });
  it("lights a stage only when it has tasks and all are done", () => {
    expect(completedStages([task("book_kickoff", "done"), task("complete_intake", "todo")])).toBe(0);
    expect(completedStages([task("book_kickoff", "done"), task("complete_intake", "done")])).toBe(1);
    expect(completedStages([])).toBe(0);
  });
  it("counts progress", () => {
    expect(progress([task("a", "done"), task("b"), task("c", "done")])).toEqual({ done: 2, total: 3 });
  });
});

describe("firstName", () => {
  it("uses the profile name when present", () => expect(firstName("Sara Lopez", "x@y.com")).toBe("Sara"));
  it("derives a name from the email otherwise", () => {
    expect(firstName(null, "sara.lopez+test@agency.com")).toBe("Sara");
    expect(firstName("  ", "houda@x.com")).toBe("Houda");
  });
});
