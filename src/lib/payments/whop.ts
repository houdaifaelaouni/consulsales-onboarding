import { unwrapWebhook } from "@whop/sdk/helpers";
import type { ChargeRequest, CheckoutRequest, PaymentEvent, PaymentProvider } from "./types";

interface WhopConfig {
  apiKey?: string;
  accountId?: string;
  webhookSecret?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

/** Whop provider. Endpoints and fields follow https://docs.whop.com (API v1). */
export function createWhopProvider(cfg: WhopConfig = {}): PaymentProvider {
  const apiKey = cfg.apiKey ?? process.env.WHOP_API_KEY;
  const accountId = cfg.accountId ?? process.env.WHOP_ACCOUNT_ID;
  const webhookSecret = cfg.webhookSecret ?? process.env.WHOP_WEBHOOK_SECRET;
  const baseUrl = cfg.baseUrl ?? process.env.WHOP_API_BASE_URL ?? "https://api.whop.com/api/v1";
  const doFetch = cfg.fetchImpl ?? fetch;

  return {
    name: "whop",

    async createCheckout(req: CheckoutRequest) {
      if (!apiKey || !accountId) throw new Error("Whop is not configured (WHOP_API_KEY, WHOP_ACCOUNT_ID)");
      const res = await doFetch(`${baseUrl}/checkout_configurations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(req.variantId
          ? { account_id: accountId, variant_id: req.variantId, redirect_url: req.redirectUrl, metadata: req.metadata }
          : {
            account_id: accountId,
            mode: "payment",
            redirect_url: req.redirectUrl,
            metadata: req.metadata,
            variant: {
              title: req.title,
              billing_type: "one_time",
              initial_price: req.amount,
              currency: req.currency,
            },
          }),
      });
      if (!res.ok) throw new Error(`Whop checkout failed (${res.status})`);
      const body = (await res.json()) as { id: string; purchase_url: string | null };
      if (!body.purchase_url) throw new Error("Whop returned no purchase_url");
      return { id: body.id, url: body.purchase_url };
    },

    async chargeSavedMethod(req: ChargeRequest) {
      if (!apiKey || !accountId) throw new Error("Whop is not configured (WHOP_API_KEY, WHOP_ACCOUNT_ID)");
      const res = await doFetch(`${baseUrl}/payments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          member_id: req.memberId,
          payment_method_id: req.paymentMethodId,
          off_session: true,
          metadata: req.metadata,
          line_items: [{ variant: { title: req.title, billing_type: "one_time", initial_price: req.amount, currency: req.currency } }],
        }),
      });
      if (!res.ok) throw new Error(`Whop charge failed (${res.status})`);
      const body = (await res.json()) as { id?: string };
      if (!body.id) throw new Error("Whop returned no payment id");
      return { id: body.id };
    },

    parseWebhook(rawBody, headers): PaymentEvent {
      // Throws WebhookVerificationError on a bad signature, stale timestamp or missing headers.
      const event = unwrapWebhook<WhopEnvelope>(rawBody, { headers, key: webhookSecret });
      if (event.type !== "payment.succeeded" && event.type !== "payment.failed") return { kind: "ignored", type: String(event.type) };
      const p = event.data;
      if (event.type === "payment.succeeded" && p.status && p.status !== "paid") return { kind: "ignored", type: `payment.${p.status}` };
      if (!p.customer_email) throw new Error("payment has no customer_email");
      const payment = {
        eventId: event.id,
        paymentId: p.id,
        email: p.customer_email.toLowerCase(),
        amount: p.total?.amount ?? p.amount_charged?.amount ?? "0",
        currency: p.total?.currency ?? p.currency ?? "eur",
        planId: p.variant_id ?? undefined,
        memberId: p.member_id ?? undefined,
        paymentMethodId: p.payment_method_id ?? undefined,
        metadata: Object.fromEntries(
          Object.entries(p.metadata ?? {}).map(([k, v]) => [k, String(v)]),
        ),
      };
      // Only a short code is kept from a failure, never card details or the provider's free text.
      if (event.type === "payment.failed") return { kind: "payment_failed", payment, reason: String(p.decline_code ?? p.substatus ?? "declined").slice(0, 60) };
      return { kind: "payment_succeeded", payment };
    },
  };
}

interface WhopMoney { amount: string; currency: string }
interface WhopEnvelope {
  id: string;
  type: string;
  data: {
    id: string;
    status?: string;
    currency?: string;
    customer_email: string | null;
    variant_id?: string | null;
    decline_code?: string | null;
    substatus?: string | null;
    member_id?: string | null;
    payment_method_id?: string | null;
    total?: WhopMoney | null;
    amount_charged?: WhopMoney | null;
    metadata?: Record<string, unknown> | null;
  };
}
