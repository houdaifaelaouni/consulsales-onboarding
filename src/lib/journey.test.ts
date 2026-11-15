import { describe, expect, it } from "vitest";
import { stageStates, type HomeTask } from "./home";

const task = (type: string, status: HomeTask["status"]): HomeTask => ({ id: type, type, status, dueAt: null });

describe("stageStates", () => {
  it("marks the first unfinished stage as current", () => {
    const s = stageStates([task("complete_intake", "done"), task("approve_icp", "todo"), task("approve_profile", "todo")]);
    expect(s).toEqual({ 1: "current", 2: "upcoming", 3: "upcoming" });
  });
  it("moves on once a stage is done", () => {
    const s = stageStates([task("complete_intake", "done"), task("approve_profile", "in_progress")]);
    expect(s[1]).toBe("done");
    expect(s[2]).toBe("current");
  });
  it("a stage with no tasks is never done", () => {
    expect(stageStates([])[1]).toBe("current");
  });
});
