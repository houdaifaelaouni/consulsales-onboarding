import { describe, expect, it } from "vitest";
import { dailyLimit, dayOfWarmup, planSends, warmupLimit, withinWindow, zonedNow, type DueSend, type SendSettings } from "./sender";

const settings: SendSettings = { invitesPerDay: 4, messagesPerDay: 6, workStart: "08:00", workEnd: "18:00", timezone: "Europe/Madrid", weekdaysOnly: true, warmup: false };

/** Monday 24 Nov 2026, 10:00 in Madrid (CET, UTC+1). */
const monday = new Date("2026-11-24T09:00:00.000Z");

const due = (over: Partial<DueSend> = {}): DueSend => ({
  enrollmentId: "e1", leadId: "l1", campaignId: "c1", position: 0, kind: "invite", body: "Hi {first_name}",
  leadName: "Ana Costa", leadTitle: "Founder", leadCompany: "Nova", linkedinKey: "ana-costa",
  providerId: "ACo1", chatId: null, acceptedAt: null, dueAt: "2026-11-01T00:00:00.000Z", ...over,
});

const plan = (over: Partial<Parameters<typeof planSends>[0]> = {}) => planSends({
  now: monday, settings, paused: false, adminStopped: false, accountStatus: "ok", warmupStart: null,
  sentToday: { invites: 0, messages: 0 }, due: [due()], batch: 20, ...over,
});

describe("zonedNow and withinWindow", () => {
  it("reads the wall clock in the workspace's zone", () => {
    expect(zonedNow(monday, "Europe/Madrid")).toEqual({ minutes: 600, weekday: 1 });
  });
  it("is inside between the start and the end, and outside before, after or exactly at the end", () => {
    expect(withinWindow(settings, monday)).toBe(true);
    expect(withinWindow(settings, new Date("2026-11-24T06:59:00.000Z"))).toBe(false);
    expect(withinWindow(settings, new Date("2026-11-24T16:59:00.000Z"))).toBe(true);
    expect(withinWindow(settings, new Date("2026-11-24T17:00:00.000Z"))).toBe(false);
  });
  it("skips the weekend when asked, and works on weekends when not", () => {
    const saturday = new Date("2026-11-28T09:00:00.000Z");
    expect(withinWindow(settings, saturday)).toBe(false);
    expect(withinWindow({ ...settings, weekdaysOnly: false }, saturday)).toBe(true);
  });
  it("follows daylight saving time", () => {
    expect(zonedNow(new Date("2026-07-06T08:00:00.000Z"), "Europe/Madrid")).toEqual({ minutes: 600, weekday: 0 });
  });
});

describe("warm-up", () => {
  it("starts at about a third of the goal, then two thirds, then the whole goal", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 20].map((d) => warmupLimit(20, d))).toEqual([7, 7, 7, 13, 13, 13, 13, 20, 20]);
  });
  it("never goes above the goal, below one, or above zero for a goal of zero", () => {
    expect(warmupLimit(2, 1)).toBe(1);
    expect(warmupLimit(0, 3)).toBe(0);
    expect(warmupLimit(5, 99)).toBe(5);
  });
  it("counts whole days since the first launch", () => {
    expect(dayOfWarmup(null, monday)).toBe(0);
    expect(dayOfWarmup("2026-11-24T08:00:00.000Z", monday)).toBe(1);
    expect(dayOfWarmup("2026-11-20T08:00:00.000Z", monday)).toBe(5);
    expect(dayOfWarmup("2026-12-01T08:00:00.000Z", monday)).toBe(0);
  });
  it("applies the ramp only when warm-up is on", () => {
    expect(dailyLimit(settings, "invite", "2026-11-24T08:00:00.000Z", monday)).toBe(4);
    expect(dailyLimit({ ...settings, warmup: true }, "invite", "2026-11-24T08:00:00.000Z", monday)).toBe(1);
    // nothing has launched yet, so the gentlest allowance applies
    expect(dailyLimit({ ...settings, warmup: true }, "message", null, monday)).toBe(1);
  });
});

describe("planSends", () => {
  it("sends a due invitation in the window", () => {
   expect(plan().sends).toHaveLength(1);
    expect(plan().block).toBeNull();
  });
  it("does nothing when sending is stopped, paused, unconnected or outside hours", () => {
    expect(plan({ adminStopped: true }).block).toBe("stopped_by_admin");
    expect(plan({ paused: true }).block).toBe("paused");
    expect(plan({ accountStatus: null }).block).toBe("no_account");
    expect(plan({ accountStatus: "credentials" }).block).toBe("needs_reconnect");
    expect(plan({ now: new Date("2026-11-24T20:00:00.000Z") }).block).toBe("outside_hours");
    for (const p of [plan({ paused: true }), plan({ adminStopped: true }), plan({ now: new Date("2026-11-24T20:00:00.000Z") })]) {
      expect(p.sends).toHaveLength(0);
    }
  });
  it("respects today's remaining budget for each kind", () => {
    const invites = [due({ enrollmentId: "a" }), due({ enrollmentId: "b" }), due({ enrollmentId: "c" })];
    expect(plan({ due: invites, sentToday: { invites: 0, messages: 0 } }).sends).toHaveLength(3);
    expect(plan({ due: invites, sentToday: { invites: 2, messages: 0 } }).sends.map((d) => d.enrollmentId)).toEqual(["a", "b"]);
    expect(plan({ due: invites, sentToday: { invites: 4, messages: 0 } }).block).toBe("nothing_due");
  });
  it("sends messages only after the invitation was accepted", () => {
    const msg = due({ enrollmentId: "m", position: 1, kind: "message", acceptedAt: null });
    expect(plan({ due: [msg] }).block).toBe("nothing_due");
    expect(plan({ due: [{ ...msg, acceptedAt: "2026-11-20T00:00:00.000Z" }] }).sends).toHaveLength(1);
    expect(plan({ due: [{ ...msg, acceptedAt: "2026-11-20T00:00:00.000Z" }], sentToday: { invites: 0, messages: 6 } }).block).toBe("nothing_due");
  });
  it("caps a run and sends the oldest first", () => {
    const items = [
      due({ enrollmentId: "new", dueAt: "2026-11-23T00:00:00.000Z" }),
      due({ enrollmentId: "old", dueAt: "2026-11-01T00:00:00.000Z" }),
      due({ enrollmentId: "mid", dueAt: "2026-11-10T00:00:00.000Z" }),
    ];
    expect(plan({ due: items, batch: 2 }).sends.map((d) => d.enrollmentId)).toEqual(["old", "mid"]);
  });
  it("never sends a step that is not the invitation at position 0", () => {
    expect(plan({ due: [due({ kind: "invite", position: 1 })] }).block).toBe("nothing_due");
  });
});
