import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createWhopProvider } from "./whop";

const SECRET = "ws_test_secret_123";

function signed(body: string, opts: { id?: string; ts?: number; secret?: string } = {}) {
  const id = opts.id ?? "msg_abc";
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  // Standard Webhooks: HMAC-SHA256 over "{id}.{timestamp}.{body}" with the literal secret bytes.
  const sig = createHmac("sha256", opts.secret ?? SECRET).update(`${id}.${ts}.${body}`).digest("base64");
  return { "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": `v1,${sig}` };
}

const event = (over: Record<string, unknown> = {}) => JSON.stringify({
  id: "msg_abc", type: "payment.succeeded", api_version: "v1", timestamp: new Date().toISOString(), account_id: "biz_1",
  data: {
    id: "pay_1", status: "paid", currency: "eur", customer_email: "Sara@Agency.com",
    total: { amount: "500.00", currency: "eur" }, metadata: { plan: "pro", company: "Studio North" }, ...over,
  },
});

const provider = () => createWhopProvider({ webhookSecret: SECRET, apiKey: "k", accountId: "biz_1" });

describe("whop webhook parsing", () => {
  it("accepts a correctly signed payment.succeeded and normalizes it", () => {
    const body = event();
    const r = provider().parseWebhook(body, signed(body));
    expect(r).toEqual({
      kind: "payment_succeeded",
      payment: { eventId: "msg_abc", paymentId: "pay_1", email: "sara@agency.com", amount: "500.00", currency: "eur", metadata: { plan: "pro", company: "Studio North" } },
    });
  });

  it("rejects a wrong signature", () => {
    const body = event();
    expect(() => provider().parseWebhook(body, signed(body, { secret: "ws_other" }))).toThrow();
  });

  it("rejects a tampered body", () => {
    const body = event();
    const headers = signed(body);
    expect(() => provider().parseWebhook(body.replace("500.00", "1.00"), headers)).toThrow();
  });

  it("rejects a stale timestamp (replay)", () => {
    const body = event();
    expect(() => provider().parseWebhook(body, signed(body, { ts: Math.floor(Date.now() / 1000) - 3600 }))).toThrow();
  });

  it("ignores other event types", () => {
    const body = JSON.stringify({ id: "msg_x", type: "payment.failed", data: {} });
    expect(provider().parseWebhook(body, signed(body, { id: "msg_x" }))).toEqual({ kind: "ignored", type: "payment.failed" });
  });

  it("ignores a payment that is not paid", () => {
    const body = event({ status: "pending" });
    expect(provider().parseWebhook(body, signed(body)).kind).toBe("ignored");
  });
});

describe("whop checkout", () => {
  it("posts a one-time checkout with metadata and returns the purchase url", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const p = createWhopProvider({
      apiKey: "k", accountId: "biz_1", webhookSecret: SECRET,
      fetchImpl: (async (url: string, init: RequestInit) => {
        seen = { url, init };
        return new Response(JSON.stringify({ id: "ch_1", purchase_url: "https://whop.com/checkout/ch_1" }), { status: 200 });
      }) as unknown as typeof fetch,
    });
    const r = await p.createCheckout({ plan: "pro", title: "Pro setup", amount: 500, currency: "eur", redirectUrl: "https://app/x", metadata: { plan: "pro" } });
    expect(r).toEqual({ id: "ch_1", url: "https://whop.com/checkout/ch_1" });
    expect(seen!.url).toBe("https://api.whop.com/api/v1/checkout_configurations");
    const body = JSON.parse(seen!.init.body as string);
    expect(body).toMatchObject({ account_id: "biz_1", mode: "payment", metadata: { plan: "pro" }, variant: { billing_type: "one_time", initial_price: 500 } });
    expect((seen!.init.headers as Record<string, string>).Authorization).toBe("Bearer k");
  });

  it("fails clearly when Whop is not configured", async () => {
    const p = createWhopProvider({ webhookSecret: SECRET });
    delete process.env.WHOP_API_KEY;
    await expect(p.createCheckout({ plan: "pro", title: "x", amount: 1, currency: "eur", redirectUrl: "u", metadata: {} })).rejects.toThrow(/not configured/);
  });
});
