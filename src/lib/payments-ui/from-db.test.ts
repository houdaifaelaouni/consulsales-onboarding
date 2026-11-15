import { describe, expect, it } from "vitest";
import { invoiceStatus } from "./logic";
import { toStageInvoices } from "./from-db";

describe("toStageInvoices", () => {
  it("always returns three stages and locks the ones without a row", () => {
    const list = toStageInvoices([{ stage: 1, amount_cents: null, currency: "EUR", created_at: "2026-11-01T00:00:00Z", paid_at: "2026-11-01T00:00:00Z", pay_url: null, pdf_url: null }]);
    expect(list.map((i) => i.stage)).toEqual([1, 2, 3]);
    expect(list.map((i) => invoiceStatus(i, new Date("2026-11-02T00:00:00Z")))).toEqual(["paid", "locked", "locked"]);
  });
  it("an unpaid row is due, then overdue after 7 days, and keeps its pay link", () => {
    const [, s2] = toStageInvoices([{ stage: 2, amount_cents: 90000, currency: "eur", created_at: "2026-11-01T00:00:00Z", paid_at: null, pay_url: "https://pay.example/x", pdf_url: null }]);
    expect(invoiceStatus(s2, new Date("2026-11-03T00:00:00Z"))).toBe("due");
    expect(invoiceStatus(s2, new Date("2026-11-10T00:00:00Z"))).toBe("overdue");
    expect(s2.payUrl).toBe("https://pay.example/x");
    expect(s2.amountCents).toBe(90000);
  });
  it("shows each stage's planned price when the plan is known, and the row's own amount once it has one", () => {
    const rows = [{ stage: 2, amount_cents: null, currency: "eur", created_at: "2026-11-01T00:00:00Z", paid_at: null, pay_url: null, pdf_url: null }];
    const list = toStageInvoices(rows, "pro");
    expect(list.map((i) => i.amountCents)).toEqual([60000, 60000, 60000]);
    expect(toStageInvoices([{ ...rows[0], amount_cents: 59000 }], "pro")[1].amountCents).toBe(59000);
  });
});
