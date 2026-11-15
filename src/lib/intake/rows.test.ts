import { describe, expect, it } from "vitest";
import { answersToRows, rowsToAnswers } from "./rows";

describe("intake rows", () => {
  it("round-trips answers", () => {
    const answers = { offer: { value: "SaaS" }, icp: { value: "", notSure: true, note: "ask" } };
    expect(rowsToAnswers(answersToRows(answers))).toEqual(answers);
  });
  it("skips empty answers", () => {
    expect(answersToRows({ a: { value: "" }, b: undefined })).toEqual([]);
  });
  it("ignores malformed stored values", () => {
    expect(rowsToAnswers([
      { question_key: "a", value: "nope" }, { question_key: "b", value: [1] },
      { question_key: "c", value: { value: 5 } }, { question_key: "d", value: { value: "ok" } },
    ])).toEqual({ d: { value: "ok" } });
  });
});
