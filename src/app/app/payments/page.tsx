import { PaymentsBoard } from "@/components/payments/payments-board";
import { PreviewNote } from "@/components/shell/preview-note";
import type { MonthlyPlan, StageInvoice } from "@/lib/payments-ui/types";

// TODO(backend): read invoices from the payment provider through the signed-in client's workspace.
const NOW = "2026-11-15T12:00:00Z";
const invoices: StageInvoice[] = [
  { stage: 1, title: "Foundation", amountCents: 0, currency: "eur", unlockedBy: "You paid at checkout", unlocks: "Your workspace and kickoff" },
  { stage: 2, title: "Build", amountCents: 0, currency: "eur", unlockedBy: "You approve your ideal client profile", unlocks: "Profile rewrite, lead lists and message sequences" },
  { stage: 3, title: "Launch", amountCents: 0, currency: "eur", unlockedBy: "You approve your profile and first messages", unlocks: "Go-live, content engine and weekly reports" },
];
const monthly: MonthlyPlan = { title: "Monthly plan", amountCents: 0, currency: "eur", startsWhen: "After stage 3 is paid" };

export default function ClientPayments() {
  return (<><PreviewNote /><PaymentsBoard initial={invoices} monthly={monthly} now={NOW} /></>);
}
