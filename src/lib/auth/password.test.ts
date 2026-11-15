import { describe, expect, it } from "vitest";
import { passwordProblem } from "./password";

describe("passwordProblem", () => {
  it("rejects short, common and email-derived passwords", () => {
    expect(passwordProblem("abc123")).toBe("login.pw.short");
    expect(passwordProblem("Password1")).toBe("login.pw.common");
    expect(passwordProblem("saralopez-2026", "sara.lopez@studio.com")).toBeNull();
    expect(passwordProblem("my-sara.lopez-pw", "sara.lopez@studio.com")).toBe("login.pw.same");
  });
  it("accepts a long enough unusual password", () => {
    expect(passwordProblem("blue-harbor-lamp-42")).toBeNull();
  });
});
