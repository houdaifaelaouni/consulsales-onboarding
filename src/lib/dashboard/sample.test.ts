import { describe, expect, it } from "vitest";
import { completedStages, nextTask, progress } from "@/lib/home";
import { DEMO_TASKS, demoTaskHref, taskHref } from "./sample";

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
  it("uses the live client pages under /app, and never links a client to the admin side", () => {
    for (const t of DEMO_TASKS) {
      const href = taskHref(t.type, "/app");
      expect(href.startsWith("/app/")).toBe(true);
    }
    expect(taskHref("approve_icp", "/app")).toBe("/app/deliverables");
  });
});
