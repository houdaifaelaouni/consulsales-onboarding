import { describe, expect, it } from "vitest";
import { intakeSavedEvent } from "./events";

describe("intakeSavedEvent", () => {
  it("counts answered questions and never carries the answers", () => {
    const e = intakeSavedEvent({ a: { value: "secret" }, b: { value: "", notSure: true }, c: { value: "" }, d: undefined });
    expect(e).toEqual({ action: "intake.saved", detail: { answered: 2 } });
    expect(JSON.stringify(e)).not.toContain("secret");
  });
});
