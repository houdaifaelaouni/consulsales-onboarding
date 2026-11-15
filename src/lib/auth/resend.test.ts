import { describe, expect, it } from "vitest";
import { cooldownLeft, looksLikeEmail, RESEND_SECONDS } from "./resend";

describe("sign-in helpers", () => {
  it("counts the cooldown down to zero", () => {
    expect(cooldownLeft(0, 0)).toBe(RESEND_SECONDS);
    expect(cooldownLeft(0, 10_500)).toBe(20);
    expect(cooldownLeft(0, 30_000)).toBe(0);
    expect(cooldownLeft(0, 99_000)).toBe(0);
  });
  it("checks the email shape", () => {
    expect(looksLikeEmail("sara@studio.com")).toBe(true);
    expect(looksLikeEmail("  sara@studio.com ")).toBe(true);
    expect(["", "sara", "sara@", "@studio.com", "sara@studio", "a b@c.com"].some(looksLikeEmail)).toBe(false);
  });
});
