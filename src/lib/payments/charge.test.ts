import { describe, expect, it, vi } from "vitest";
import { chargeDueInvoices, isDue, type ChargeRepo, type DueInvoice } from "./charge";
import type { PaymentProvider } from "./types";

const NOW = new Date("2026-11-20T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

describe("isDue", () => {
  const inv = (o: Partial<DueInvoice> = {}): DueInvoice => ({ stage: 2, attempts: 0, attemptedAt: null, failed: false, ...o });
  it("charges a new invoice, never one already in flight", () => {
    expect(isDue(inv(), NOW)).toBe(true);
    expect(isDue(inv({ attempts: 1, attemptedAt: hoursAgo(30), failed: false }), NOW)).toBe(false); // waiting for the result
  });
  it("retries a failed charge only after a day, and stops after three attempts", () => {
    expect(isDue(inv({ attempts: 1, attemptedAt: hoursAgo(2), failed: true }), NOW)).toBe(false);
    expect(isDue(inv({ attempts: 1, attemptedAt: hoursAgo(25), failed: true }), NOW)).toBe(true);
    expect(isDue(inv({ attempts: 3, attemptedAt: hoursAgo(99), failed: true }), NOW)).toBe(false);
  });
});

function setup(opts: { account?: boolean; invoices?: DueInvoice[]; claim?: boolean; chargeFails?: boolean } = {}) {
  const repo: ChargeRepo & { failures: string[] } = {
    failures: [],
    loadAccount: async () => (opts.account === false ? null : { plan: "pro", memberId: "mber_1", paymentMethodId: "payt_1" }),
    listUnpaid: async () => opts.invoices ?? [{ stage: 2, attempts: 0, attemptedAt: null, failed: false }],
    claim: vi.fn().mockResolvedValue(opts.claim ?? true),
    recordFailure: async (_w, _s, reason) => { repo.failures.push(reason); },
  };
  const charge = vi.fn(async () => { if (opts.chargeFails) throw new Error("boom"); return { id: "pay_1" }; });
  const provider = { name: "whop", chargeSavedMethod: charge } as unknown as PaymentProvider;
  return { repo, provider, charge };
}

describe("chargeDueInvoices", () => {
  it("charges the saved card the plan's price for the stage, marking where it came from", async () => {
    const { repo, provider, charge } = setup();
    expect(await chargeDueInvoices({ repo, provider, now: NOW }, "ws")).toEqual([{ stage: 2, result: "charging" }]);
    expect(charge).toHaveBeenCalledWith(expect.objectContaining({ memberId: "mber_1", paymentMethodId: "payt_1", amount: 750, currency: "eur", metadata: { kind: "stage", workspace_id: "ws", stage: "2" } }));
    expect(repo.claim).toHaveBeenCalledWith("ws", 2, 75000, "eur", expect.any(String));
  });
  it("does nothing without a saved card, so the client pays by link", async () => {
    const { repo, provider, charge } = setup({ account: false });
    expect(await chargeDueInvoices({ repo, provider, now: NOW }, "ws")).toEqual([]);
    expect(charge).not.toHaveBeenCalled();
  });
  it("never charges when someone else already claimed the invoice", async () => {
    const { repo, provider, charge } = setup({ claim: false });
    expect(await chargeDueInvoices({ repo, provider, now: NOW }, "ws")).toEqual([{ stage: 2, result: "skipped" }]);
    expect(charge).not.toHaveBeenCalled();
  });
  it("records a failed request with a short code, so the page offers a pay link", async () => {
    const { repo, provider } = setup({ chargeFails: true });
    expect(await chargeDueInvoices({ repo, provider, now: NOW }, "ws")).toEqual([{ stage: 2, result: "failed" }]);
    expect(repo.failures).toEqual(["charge_request_failed"]);
  });
  it("skips an invoice already being charged", async () => {
    const { repo, provider, charge } = setup({ invoices: [{ stage: 3, attempts: 1, attemptedAt: hoursAgo(1), failed: false }] });
    expect(await chargeDueInvoices({ repo, provider, now: NOW }, "ws")).toEqual([{ stage: 3, result: "skipped" }]);
    expect(charge).not.toHaveBeenCalled();
  });
});
