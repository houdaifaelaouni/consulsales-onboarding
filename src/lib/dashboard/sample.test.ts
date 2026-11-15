import { describe, expect, it } from "vitest";
import { completedStages, nextTask, progress } from "@/lib/home";
import { DEMO_TASKS, demoTaskHref } from "./sample";

describe("demo overview data", () => {
  it("tells a coherent story: one task done, intake is next", () => {
    expect(progress(DEMO_TASKS)).toEqual({ done: 1, total: 7 });
    expect(nextTask(DEMO_TASKS)?.type).toBe("complete_intake");
    expect(completedStages(DEMO_TASKS)).toBe(0);
  });
  it("sends every task to a real demo screen", () => {
    const pages = new Set(["/demo/booking", "/demo/intake", "/demo/access", "/demo/review"]);
    for (const t of DEMO_TASKS) expect(pages.has(demoTaskHref(t.type))).toBe(true);
  });
});
