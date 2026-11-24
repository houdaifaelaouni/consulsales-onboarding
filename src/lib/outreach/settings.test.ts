import { describe, expect, it } from "vitest";
import { CAPS, DEFAULT_SETTINGS, sendingState, shortTime, validateSettings, type OutreachSettings } from "./settings";

const ok = (over: Partial<OutreachSettings> = {}) => validateSettings({ ...DEFAULT_SETTINGS, ...over });

describe("validateSettings", () => {
  it("accepts the defaults and the exact hard limits", () => {
    expect(ok().ok).toBe(true);
    expect(ok({ invitesPerDay: CAPS.invitesPerDay, messagesPerDay: CAPS.messagesPerDay, workStart: "06:00", workEnd: "22:00" }).ok).toBe(true);
    expect(ok({ invitesPerDay: 0, messagesPerDay: 0 }).ok).toBe(true);
  });
  it("refuses a limit above the cap, below zero, or not a whole number", () => {
    expect(ok({ invitesPerDay: 21 })).toEqual({ ok: false, field: "invitesPerDay" });
    expect(ok({ invitesPerDay: -1 })).toEqual({ ok: false, field: "invitesPerDay" });
    expect(ok({ invitesPerDay: 2.5 })).toEqual({ ok: false, field: "invitesPerDay" });
    expect(ok({ invitesPerDay: Number.NaN })).toEqual({ ok: false, field: "invitesPerDay" });
    expect(ok({ messagesPerDay: 51 })).toEqual({ ok: false, field: "messagesPerDay" });
  });
  it("refuses hours outside 06:00 to 22:00, an end before the start, and bad times", () => {
    for (const hours of [{ workStart: "05:59" }, { workEnd: "22:01" }, { workStart: "12:00", workEnd: "12:00" }, { workStart: "18:00", workEnd: "09:00" }, { workStart: "9am" }, { workEnd: "" }]) {
      expect(ok(hours)).toEqual({ ok: false, field: "hours" });
    }
  });
  it("refuses a timezone that is not on the list", () => {
    expect(ok({ timezone: "Mars/Olympus" })).toEqual({ ok: false, field: "timezone" });
  });
});

describe("sendingState", () => {
  const base = { accountStatuses: ["ok"], paused: false, adminStopped: false };
  it("sends only when connected, not paused and not stopped", () => expect(sendingState(base)).toBe("sending"));
  it("an admin stop beats everything", () => expect(sendingState({ ...base, adminStopped: true })).toBe("stopped_by_admin"));
  it("needs an account, then a healthy one, then the client's switch", () => {
    expect(sendingState({ ...base, accountStatuses: [] })).toBe("no_account");
    expect(sendingState({ ...base, accountStatuses: ["credentials"] })).toBe("needs_reconnect");
    expect(sendingState({ ...base, paused: true })).toBe("paused");
  });
  it("one healthy account is enough", () => expect(sendingState({ ...base, accountStatuses: ["error", "ok"] })).toBe("sending"));
});

describe("shortTime", () => {
  it("trims seconds", () => expect(shortTime("08:00:00")).toBe("08:00"));
});
