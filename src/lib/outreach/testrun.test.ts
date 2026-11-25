import { describe, expect, it } from "vitest";
import { simulateRun, TEST_LEAD } from "./testrun";

const steps = [
  { delayDays: 0, body: "Hi {first_name}, quick note for {company}." },
  { delayDays: 1, body: "Following up, {first_name}." },
  { delayDays: 4, body: "Should I close the loop?" },
];

describe("simulateRun", () => {
  it("fills the real campaign text with the prospect's details", () => {
    const turns = simulateRun(steps, TEST_LEAD, "Sounds interesting.");
    expect(turns[0]).toEqual({ role: "agent", text: "Hi Sara, quick note for Studio North." });
    expect(turns[1]).toEqual({ role: "agent", text: "Following up, Sara." });
  });

  it("stops at the reply, so later messages never appear", () => {
    const turns = simulateRun(steps, TEST_LEAD, "Sounds interesting.");
    expect(turns.at(-1)).toEqual({ role: "lead", text: "Sounds interesting." });
    expect(turns.some((t) => t.text.includes("close the loop"))).toBe(false);
  });

  it("skips an empty connection note", () => {
    const turns = simulateRun([{ delayDays: 0, body: "" }, ...steps.slice(1)], TEST_LEAD, "Ok");
    expect(turns).toHaveLength(2);
    expect(turns[0].role).toBe("agent");
  });

  it("is deterministic", () => {
    expect(simulateRun(steps, TEST_LEAD, "Ok")).toEqual(simulateRun(steps, TEST_LEAD, "Ok"));
  });
});
