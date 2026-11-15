import { PaymentsBoard } from "@/components/payments/payments-board";
import type { MonthlyPlan, StageInvoice } from "@/lib/payments-ui/types";

// Sample data with a fixed demo clock so the page is stable. Amounts are illustrative, not real prices.
const NOW = "2026-11-15T12:00:00Z";
const ago = (d: number) => new Date(Date.parse(NOW) - d * 86_400_000).toISOString();

const invoices: StageInvoice[] = [
  { stage: 1, title: "Foundation", amountCents: 50000, currency: "eur", unlockedBy: "You paid at checkout", unlocks: "Your workspace and kickoff", createdAt: ago(10), paidAt: ago(10) },
  { stage: 2, title: "Build", amountCents: 90000, currency: "eur", unlockedBy: "You approved your ideal client profile", unlocks: "Profile rewrite, lead lists and message sequences", createdAt: ago(3) },
  { stage: 3, title: "Launch", amountCents: 70000, currency: "eur", unlockedBy: "You approve your profile and first messages", unlocks: "Go-live, content engine and weekly reports" },
];
const monthly: MonthlyPlan = { title: "Monthly plan", amountCents: 120000, currency: "eur", startsWhen: "After stage 3 is paid" };

export default function DemoPayments() {
  return (
    <PaymentsBoard initial={invoices} monthly={monthly} now={NOW} />
  );
}
