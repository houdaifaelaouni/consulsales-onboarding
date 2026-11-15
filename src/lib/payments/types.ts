/** Provider-neutral payment types. The app only depends on this file, not on Whop. */
export interface NormalizedPayment {
  /** Unique id of the webhook delivery, used for idempotency. */
  eventId: string;
  paymentId: string;
  email: string;
  amount: string;
  currency: string;
  /** The Whop plan the buyer picked (variant_id, `plan_...`). Used to know which of our plans was bought. */
  planId?: string;
  /** Whop's ids for the buyer and the card they paid with, kept so later stages can be charged automatically. */
  memberId?: string;
  paymentMethodId?: string;
  metadata: Record<string, string>;
}

export type PaymentEvent =
  | { kind: "payment_succeeded"; payment: NormalizedPayment }
  | { kind: "ignored"; type: string };

export interface CheckoutRequest {
  plan: string;
  title: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  metadata: Record<string, string>;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(req: CheckoutRequest): Promise<{ id: string; url: string }>;
  /** Verifies the signature on the raw body and returns a normalized event. Throws if invalid. */
  parseWebhook(rawBody: string, headers: Record<string, string>): PaymentEvent;
}
