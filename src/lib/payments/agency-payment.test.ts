import { describe, expect, it } from "vitest";
import { classifyPayment, tierFromWhopId } from "./classify";
import { createAgencyBilling, type AgencyRepo } from "./agency";
import { handlePayment, type HandleDeps } from "./handle";
import { createWhopProvider } from "./whop";
import type { NormalizedPayment } from "./types";
import type { AgencyTier } from "@/lib/agency/tiers";

const AG = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const env = { WHOP_PLAN_STARTER: "plan_s", WHOP_PLAN_PRO: "plan_p", WHOP_PLAN_ENTERPRISE: "plan_e", WHOP_AGENCY_PLAN_STARTER: "plan_as", WHOP_AGENCY_PLAN_GROWTH: "plan_ag", WHOP_AGENCY_PLAN_SCALE: "plan_ac" };
const pay = (o: Partial<NormalizedPayment> = {}): NormalizedPayment => ({ eventId: "evt_1", paymentId: "pay_1", email: "a@b.co", amount: "129.00", currency: "eur", planId: "plan_ag", metadata: { agency_id: AG }, ...o });

function fakeAgencies(start: AgencyTier | null) {
  const state = { tier: start };
  const repo: AgencyRepo = {
    getTier: async () => state.tier,
    setTier: async (_id, from, to) => { if (state.tier !== from) return false; state.tier = to; return true; },
  };
  return { state, billing: createAgencyBilling(repo) };
}

const deps = (agency?: HandleDeps["agency"]): HandleDeps => ({
  env, agency, stageRepo: {} as HandleDeps["stageRepo"], provision: async () => { throw new Error("must not provision"); },
});

describe("agency payment classification", () => {
  it("maps a Whop plan id to an agency tier", () => {
    expect(tierFromWhopId("plan_ag", env)).toBe("growth");
    expect(tierFromWhopId("plan_x", env)).toBeNull();
    expect(tierFromWhopId(undefined, env)).toBeNull();
    expect(tierFromWhopId("plan_ag", {})).toBeNull();
  });
  it("recognises an agency payment and never mistakes it for a client sign-up", () => {
    expect(classifyPayment(pay(), env)).toEqual({ type: "agency", agencyId: AG, tier: "growth" });
  });
  it("rejects an agency plan with bad agency metadata", () => {
    expect(classifyPayment(pay({ metadata: { agency_id: "nope" } }), env).type).toBe("unknown");
    expect(classifyPayment(pay({ metadata: {} }), env).type).toBe("unknown");
  });
  it("ignores agency metadata on a payment that is not for an agency plan", () => {
    expect(classifyPayment(pay({ planId: "plan_p" }), env)).toEqual({ type: "signup", plan: "pro" });
  });
});

describe("agency payment handling", () => {
  it("upgrades the agency to the tier it paid for", async () => {
    const { state, billing } = fakeAgencies("free");
    const r = await handlePayment(deps(billing), pay());
    expect(r).toEqual({ status: 200, body: { ok: true, result: "upgraded" } });
    expect(state.tier).toBe("growth");
  });
  it("is idempotent: the same payment twice changes nothing the second time", async () => {
    const { state, billing } = fakeAgencies("free");
    await handlePayment(deps(billing), pay());
    const again = await handlePayment(deps(billing), pay());
    expect(again.body.result).toBe("unchanged");
    expect(state.tier).toBe("growth");
  });
  it("never downgrades on a late payment for a lower tier", async () => {
    const { state, billing } = fakeAgencies("scale");
    const r = await handlePayment(deps(billing), pay());
    expect(r.body.result).toBe("unchanged");
    expect(state.tier).toBe("scale");
  });
  it("refuses a payment below the tier price, and an unknown agency", async () => {
    const { state, billing } = fakeAgencies("free");
    expect((await handlePayment(deps(billing), pay({ amount: "50.00" }))).status).toBe(422);
    expect(state.tier).toBe("free");
    const none = fakeAgencies(null);
    expect((await handlePayment(deps(none.billing), pay())).status).toBe(422);
  });
  it("refuses an agency payment when agency billing is not wired", async () => {
    expect((await handlePayment(deps(undefined), pay())).status).toBe(422);
  });
});

describe("whop plan-based checkout", () => {
  it("sends the existing plan as variant_id with our metadata, not an inline price", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const fetchImpl = (async (_u: string, init: RequestInit) => { calls.push(JSON.parse(String(init.body))); return { ok: true, json: async () => ({ id: "ch_1", purchase_url: "https://whop.com/checkout/ch_1" }) }; }) as unknown as typeof fetch;
    const p = createWhopProvider({ apiKey: "k", accountId: "biz_1", fetchImpl });
    const r = await p.createCheckout({ plan: "growth", title: "x", amount: 129, currency: "eur", redirectUrl: "https://app/x", metadata: { agency_id: AG }, variantId: "plan_ag" });
    expect(r).toEqual({ id: "ch_1", url: "https://whop.com/checkout/ch_1" });
    expect(calls[0]).toMatchObject({ account_id: "biz_1", variant_id: "plan_ag", metadata: { agency_id: AG } });
    expect(calls[0]).not.toHaveProperty("variant");
    expect(calls[0]).not.toHaveProperty("mode");
  });
});
