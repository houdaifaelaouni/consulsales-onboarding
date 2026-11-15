import { describe, expect, it } from "vitest";
import { QUESTIONS } from "./questions";
import { intakeSavedEvent, intakeTaskStatus } from "./events";

describe("intakeSavedEvent", () => {
  it("counts answered questions and never carries the answers", () => {
    const e = intakeSavedEvent({ a: { value: "secret" }, b: { value: "", notSure: true }, c: { value: "" }, d: undefined });
    expect(e).toEqual({ action: "intake.saved", detail: { answered: 2 } });
    expect(JSON.stringify(e)).not.toContain("secret");
  });
});

describe("intakeTaskStatus", () => {
  it("is todo with no answers, in progress with some, done when every step is complete", () => {
    expect(intakeTaskStatus({})).toBe("todo");
    expect(intakeTaskStatus({ [QUESTIONS[0].key]: { value: "x" } })).toBe("in_progress");
    const all = Object.fromEntries(QUESTIONS.map((q) => [q.key, { value: "x" }]));
    expect(intakeTaskStatus(all)).toBe("done");
  });
});
