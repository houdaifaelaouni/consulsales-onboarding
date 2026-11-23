import { describe, expect, it } from "vitest";
import { daysToSend, LIMITS, renderTemplate, validateCampaign, type StepInput } from "./campaign";

const ok: StepInput[] = [{ delayDays: 0, body: "" }, { delayDays: 1, body: "Thanks for connecting" }, { delayDays: 3, body: "Follow-up" }];

describe("validateCampaign", () => {
  it("accepts a request with no note and two messages", () => expect(validateCampaign("Q4", ok)).toEqual({ ok: true }));
  it("needs a name of 1 to 80 characters", () => {
    expect(validateCampaign("  ", ok)).toEqual({ ok: false, field: "name" });
    expect(validateCampaign("x".repeat(81), ok)).toEqual({ ok: false, field: "name" });
  });
  it("needs the request plus 1 to 8 messages", () => {
    expect(validateCampaign("Q4", [ok[0]])).toEqual({ ok: false, field: "messages" });
    const nine = [ok[0], ...Array.from({ length: LIMITS.maxMessages + 1 }, () => ok[1])];
    expect(validateCampaign("Q4", nine)).toEqual({ ok: false, field: "messages" });
    expect(validateCampaign("Q4", [ok[0], ...Array.from({ length: LIMITS.maxMessages }, () => ok[1])]).ok).toBe(true);
  });
  it("limits the connection note to 300 characters", () => {
    expect(validateCampaign("Q4", [{ delayDays: 0, body: "n".repeat(300) }, ok[1]]).ok).toBe(true);
    expect(validateCampaign("Q4", [{ delayDays: 0, body: "n".repeat(301) }, ok[1]])).toEqual({ ok: false, field: "note", step: 0 });
  });
  it("refuses an empty or too long message and points at it", () => {
    expect(validateCampaign("Q4", [ok[0], { delayDays: 1, body: "  " }])).toEqual({ ok: false, field: "message", step: 1 });
    expect(validateCampaign("Q4", [ok[0], ok[1], { delayDays: 1, body: "m".repeat(2001) }])).toEqual({ ok: false, field: "message", step: 2 });
  });
  it("refuses a delay that is negative, fractional or over 30 days", () => {
    for (const d of [-1, 1.5, 31, Number.NaN]) expect(validateCampaign("Q4", [ok[0], { delayDays: d, body: "m" }])).toEqual({ ok: false, field: "delay", step: 1 });
  });
});

describe("renderTemplate", () => {
  const lead = { fullName: "Ana Maria Costa", title: "Founder", company: "Nova" };
  it("fills every placeholder", () => {
    expect(renderTemplate("Hi {first_name} {last_name}, {title} at {company} ({full_name})", lead)).toBe("Hi Ana Maria Costa, Founder at Nova (Ana Maria Costa)");
  });
  it("never leaves a raw tag, and tidies the gap a missing value leaves", () => {
    expect(renderTemplate("Hi {first_name}, how is {company} doing?", { fullName: "Ana" })).toBe("Hi Ana, how is doing?");
    expect(renderTemplate("Hello {nonsense}there", lead)).toBe("Hello there");
    expect(renderTemplate("Hi {first_name} , welcome", { fullName: "Ana" })).toBe("Hi Ana, welcome");
  });
  it("keeps line breaks", () => expect(renderTemplate("Hi {first_name}\n\nBest", lead)).toBe("Hi Ana\n\nBest"));
});

describe("daysToSend", () => {
  it("rounds up and handles zero", () => {
    expect(daysToSend(6, 12)).toBe(1);
    expect(daysToSend(25, 12)).toBe(3);
    expect(daysToSend(0, 12)).toBe(0);
    expect(daysToSend(10, 0)).toBe(0);
  });
});
