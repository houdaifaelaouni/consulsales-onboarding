import { createWhopProvider } from "./whop";
import type { PaymentProvider } from "./types";

export type { PaymentProvider, PaymentEvent, NormalizedPayment, CheckoutRequest } from "./types";

/** Single switch point if the provider ever changes. */
export function getPaymentProvider(): PaymentProvider {
  return createWhopProvider();
}
