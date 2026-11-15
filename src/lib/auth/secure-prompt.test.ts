import { describe, expect, it } from "vitest";
import { shouldPrompt, SNOOZE_DAYS } from "./secure-prompt";

const now = Date.UTC(2026, 10, 15);
const day = 86_400_000;

describe("shouldPrompt", () => {
  it("shows when there is no PIN and it was never dismissed", () => {
    expect(shouldPrompt({ pin: "off", dismissedAt: null, now })).toBe(true);
  });
  it("never shows when a PIN is set, or when PINs are not available", () => {
    expect(shouldPrompt({ pin: "on", dismissedAt: null, now })).toBe(false);
    expect(shouldPrompt({ pin: "unavailable", dismissedAt: null, now })).toBe(false);
  });
  it("stays hidden for a week after Not now, then comes back", () => {
    expect(shouldPrompt({ pin: "off", dismissedAt: now - 2 * day, now })).toBe(false);
    expect(shouldPrompt({ pin: "off", dismissedAt: now - (SNOOZE_DAYS - 1) * day, now })).toBe(false);
    expect(shouldPrompt({ pin: "off", dismissedAt: now - SNOOZE_DAYS * day, now })).toBe(true);
  });
  it("ignores a garbage stored value", () => {
    expect(shouldPrompt({ pin: "off", dismissedAt: Number("abc"), now })).toBe(true);
  });
});
