import { describe, expect, it } from "vitest";
import { answeredCount, firstIncompleteStep, isAnswered, isComplete, isStepComplete, minutesLeft, missingRequired, questionsForStep } from "./logic";
import { MAX_QUESTIONS_PER_STEP, QUESTIONS, STEPS } from "./questions";

const fill = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, { value: "x" }]));
const requiredKeys = (step: number) => QUESTIONS.filter((q) => q.step === step && q.required).map((q) => q.key);

describe("question config", () => {
  it("has at most 6 questions per step (PDR)", () => {
    for (const s of STEPS) expect(questionsForStep(s.id).length).toBeLessThanOrEqual(MAX_QUESTIONS_PER_STEP);
  });
  it("has unique keys, and select questions have options", () => {
    expect(new Set(QUESTIONS.map((q) => q.key)).size).toBe(QUESTIONS.length);
    for (const q of QUESTIONS.filter((x) => x.type === "select")) expect(q.options?.length).toBeGreaterThan(1);
  });
});

describe("answers", () => {
  it("treats blank as unanswered and 'not sure' as answered", () => {
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered({ value: "   " })).toBe(false);
    expect(isAnswered({ value: "", notSure: true })).toBe(true);
  });
  it("lists missing required questions only", () => {
    expect(missingRequired(1, {}).map((q) => q.key)).toEqual(requiredKeys(1));
    expect(missingRequired(1, fill(requiredKeys(1)))).toEqual([]);
  });
  it("lets 'not sure' satisfy a required question", () => {
    const a = { offer: { value: "", notSure: true, note: "ask on kickoff" } };
    expect(missingRequired(1, a).map((q) => q.key)).not.toContain("offer");
  });
  it("finds where to resume", () => {
    expect(firstIncompleteStep({})).toBe(1);
    expect(firstIncompleteStep(fill([...requiredKeys(1), ...requiredKeys(2)]))).toBe(3);
  });
  it("is complete only when every step's required questions are answered", () => {
    const all = fill(QUESTIONS.filter((q) => q.required).map((q) => q.key));
    expect(isComplete(all)).toBe(true);
    expect(isStepComplete(4, {})).toBe(false);
  });
  it("estimates time left and counts progress", () => {
    expect(minutesLeft({})).toBeGreaterThan(5);
    expect(minutesLeft(fill(QUESTIONS.map((q) => q.key)))).toBe(0);
    expect(answeredCount(fill(["offer"]))).toEqual({ done: 1, total: QUESTIONS.length });
  });
});
