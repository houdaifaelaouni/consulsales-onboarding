import { PayToEnter } from "@/components/payments/pay-to-enter";

/** The pay-to-enter screen with sample data. No checkout session here, so the payment panel shows its "not switched on" state. */
export default function DemoPay() {
  return (
    <PayToEnter
      amount="€300" nextAmount="€750" planTitle="Growth" holder="Sara Lopez" company="Arc Media" email="sara@example.com"
      checkoutId={null} payUrl={null}
    />
  );
}
