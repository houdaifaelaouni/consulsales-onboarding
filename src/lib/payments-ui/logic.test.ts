import { describe, expect, it } from "vitest";
import { daysUntilDue, formatMoney, invoiceStatus, needsAdminFlag, nextReminderDay, summarize } from "./logic";
import type { StageInvoice } from "./types";

const now = new Date("2026-11-15T12:00:00Z");
const ago = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
const inv = (over: Partial<StageInvoice> = {}): StageInvoice => ({
  stage: 2, title: "Build", amountCents: 90000, currency: "eur", unlockedBy: "ICP approved", unlocks: "Go-live", ...over,
});

describe("invoiceStatus", () => {
  it("is locked until the gating deliverable creates the invoice", () => {
    expect(invoiceStatus(inv(), now)).toBe("locked");
  });
  it("is due for 7 days, then overdue", () => {
    expect(invoiceStatus(inv({ createdAt: ago(7) }), now)).toBe("due");
    expect(invoiceStatus(inv({ createdAt: ago(8) }), now)).toBe("overdue");
  });
  it("is paid once paid, even if it was late", () => {
    expect(invoiceStatus(inv({ createdAt: ago(20), paidAt: ago(1) }), now)).toBe("paid");
  });
});

describe("due dates and reminders", () => {
  it("counts days until due and goes negative when late", () => {
    expect(daysUntilDue(inv({ createdAt: ago(2) }), now)).toBe(5);
    expect(daysUntilDue(inv({ createdAt: ago(10) }), now)).toBe(-3);
    expect(daysUntilDue(inv(), now)).toBeNull();
  });
  it("reminds at day 3 and 7, then stops", () => {
    expect(nextReminderDay(inv({ createdAt: ago(1) }), now)).toBe(3);
    expect(nextReminderDay(inv({ createdAt: ago(3) }), now)).toBe(7);
    expect(nextReminderDay(inv({ createdAt: ago(7) }), now)).toBeNull();
    expect(nextReminderDay(inv({ createdAt: ago(1), paidAt: ago(0) }), now)).toBeNull();
  });
  it("flags the team from day 8 while unpaid", () => {
    expect(needsAdminFlag(inv({ createdAt: ago(7) }), now)).toBe(false);
    expect(needsAdminFlag(inv({ createdAt: ago(8) }), now)).toBe(true);
    expect(needsAdminFlag(inv({ createdAt: ago(8), paidAt: ago(0) }), now)).toBe(false);
  });
});

describe("summarize", () => {
  it("adds paid and outstanding amounts and picks the oldest open invoice next", () => {
    const s = summarize([
      inv({ stage: 1, amountCents: 50000, createdAt: ago(20), paidAt: ago(19) }),
      inv({ stage: 2, amountCents: 90000, createdAt: ago(2) }),
      inv({ stage: 3, amountCents: 70000 }),
    ], now);
    expect(s).toMatchObject({ paidCents: 50000, outstandingCents: 90000, paidCount: 1, total: 3 });
    expect(s.nextToPay?.stage).toBe(2);
  });
});

describe("formatMoney", () => {
  it("formats whole and fractional amounts per locale", () => {
    expect(formatMoney(90000, "eur", "en")).toBe("€900");
    expect(formatMoney(90050, "eur", "en")).toBe("€900.50");
    expect(formatMoney(90000, "eur", "fr").replace(/\s/g, " ")).toMatch(/900.*€/);
  });
});
