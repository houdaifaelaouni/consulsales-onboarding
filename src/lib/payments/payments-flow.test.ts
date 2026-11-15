import { describe, expect, it, vi } from "vitest";
import { amountAtLeast, classifyPayment, planFromWhopId } from "./classify";
import { handlePayment } from "./handle";
import { settleStage, type StageRepo } from "./stage";
import type { NormalizedPayment } from "./types";

const WS = "11111111-2222-3333-4444-555555555555";
const env = { WHOP_PLAN_STARTER: "plan_s", WHOP_PLAN_PRO: "plan_p", WHOP_PLAN_ENTERPRISE: "plan_e" };
const pay = (o: Partial<NormalizedPayment> = {}): NormalizedPayment => ({ eventId: "evt_1", paymentId: "pay_1", email: "a@b.co", amount: "300.0", currency: "eur", metadata: {}, ...o });

describe("amountAtLeast", () => {
  it("compares in cents and accepts tax on top", () => {
    expect(amountAtLeast("300.0", 300)).toBe(true);
    expect(amountAtLeast("300", 300)).toBe(true);
    expect(amountAtLeast("363.00", 300)).toBe(true);
    expect(amountAtLeast("299.99", 300)).toBe(false);
    expect(amountAtLeast("abc", 300)).toBe(false);
  });
});

describe("classifyPayment", () => {
  it("knows which plan was bought from the Whop plan id", () => {
    expect(planFromWhopId("plan_p", env)).toBe("pro");
    expect(planFromWhopId("plan_x", env)).toBeNull();
    expect(classifyPayment(pay({ planId: "plan_e" }), env)).toEqual({ type: "signup", plan: "enterprise" });
  });
  it("does not trust plan metadata once plan ids are configured", () => {
    expect(classifyPayment(pay({ metadata: { plan: "enterprise" } }), env).type).toBe("unknown");
    expect(classifyPayment(pay({ metadata: { plan: "enterprise" } }), {})).toEqual({ type: "signup", plan: "enterprise" });
  });
  it("recognises a stage payment from our own checkout and rejects bad metadata", () => {
    expect(classifyPayment(pay({ metadata: { kind: "stage", workspace_id: WS, stage: "2" } }), env)).toEqual({ type: "stage", workspaceId: WS, stage: 2 });
    for (const bad of [{ stage: "1" }, { stage: "4" }, { stage: "2", workspace_id: "nope" }]) {
      expect(classifyPayment(pay({ metadata: { kind: "stage", workspace_id: WS, ...bad } }), env).type).toBe("unknown");
    }
  });
});

function fakeRepo(inv: { amountCents: number | null; paid: boolean } | null): StageRepo & { paid: number; logged: number } {
  const r = {
    paid: 0, logged: 0,
    getInvoice: async () => inv,
    markPaid: async () => { if (inv?.paid) return false; r.paid++; if (inv) inv.paid = true; return true; },
    logPaid: async () => { r.logged++; },
  };
  return r;
}

describe("settleStage", () => {
  it("marks an unlocked invoice paid once, and repeats are harmless", async () => {
    const repo = fakeRepo({ amountCents: 30000, paid: false });
    expect(await settleStage(repo, pay(), WS, 2)).toBe("paid");
    expect(await settleStage(repo, pay(), WS, 2)).toBe("already_paid");
    expect([repo.paid, repo.logged]).toEqual([1, 1]);
  });
  it("refuses an invoice that was never unlocked, has no price, or is underpaid", async () => {
    expect(await settleStage(fakeRepo(null), pay(), WS, 2)).toBe("rejected");
    expect(await settleStage(fakeRepo({ amountCents: null, paid: false }), pay(), WS, 2)).toBe("rejected");
    const repo = fakeRepo({ amountCents: 30000, paid: false });
    expect(await settleStage(repo, pay({ amount: "100" }), WS, 2)).toBe("rejected");
    expect(repo.paid).toBe(0);
  });
});

describe("handlePayment", () => {
  const stageRepo = fakeRepo({ amountCents: 30000, paid: false });
  it("answers 422 for a payment it cannot place", async () => {
    const r = await handlePayment({ env, stageRepo, provision: vi.fn() }, pay({ planId: "plan_unknown" }));
    expect(r.status).toBe(422);
  });
  it("refuses a first payment below the stage 1 price, without creating anything", async () => {
    const provision = vi.fn();
    const r = await handlePayment({ env, stageRepo, provision }, pay({ planId: "plan_p", amount: "299.99" })); // below the 300 every plan pays at checkout
    expect(r.status).toBe(422);
    expect(provision).not.toHaveBeenCalled();
  });
  it("creates the workspace for the plan that was bought", async () => {
    const provision = vi.fn().mockResolvedValue({ status: "created" });
    const r = await handlePayment({ env, stageRepo, provision }, pay({ planId: "plan_p", amount: "300" }));
    expect(r).toEqual({ status: 200, body: { ok: true, result: "created" } });
    expect(provision.mock.calls[0][0].metadata.plan).toBe("pro");
  });
  it("settles a stage payment", async () => {
    const r = await handlePayment({ env, stageRepo: fakeRepo({ amountCents: 30000, paid: false }), provision: vi.fn() }, pay({ metadata: { kind: "stage", workspace_id: WS, stage: "2" } }));
    expect(r).toEqual({ status: 200, body: { ok: true, result: "paid" } });
  });
});
