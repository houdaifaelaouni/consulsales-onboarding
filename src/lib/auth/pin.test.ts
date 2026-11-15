import { describe, expect, it } from "vitest";
import { isPinFormat, isWeakPin, pinProblem, pushDigit } from "./pin";

describe("PIN rules", () => {
  it("needs exactly six digits", () => {
    expect(isPinFormat("482915")).toBe(true);
    for (const bad of ["", "12345", "1234567", "12345a", "12 456"]) expect(isPinFormat(bad)).toBe(false);
  });
  it("refuses repeats, runs and famous PINs", () => {
    for (const weak of ["000000", "111111", "123456", "234567", "345678", "567890", "654321", "987654", "012345", "121212", "696969"]) {
      expect(isWeakPin(weak), weak).toBe(true);
    }
    for (const ok of ["482915", "739104", "280417"]) expect(isWeakPin(ok), ok).toBe(false);
  });
  it("returns a message key for the first problem", () => {
    expect(pinProblem("12")).toBe("pin.err.format");
    expect(pinProblem("111111")).toBe("pin.err.weak");
    expect(pinProblem("482915")).toBeNull();
  });
  it("only accepts digits and stops at six", () => {
    expect(pushDigit("", "4")).toBe("4");
    expect(pushDigit("48", "x")).toBe("48");
    expect(pushDigit("482915", "7")).toBe("482915");
  });
});
