import { PLANS, type PlanKey } from "@/lib/plans";
import type { StageInvoice } from "./types";

export interface InvoiceRow { stage: number; amount_cents: number | null; currency: string; created_at: string; paid_at: string | null; pay_url: string | null; pdf_url: string | null; charge_attempted_at?: string | null; charge_error?: string | null }

/** What each stage is and what unlocks it: charged once the client can see the work it covers. */
const STAGES: Array<Pick<StageInvoice, "stage" | "title" | "unlockedBy" | "unlocks">> = [
  { stage: 1, title: "Foundation", unlockedBy: "You paid at checkout", unlocks: "Your workspace and kickoff" },
  { stage: 2, title: "Build", unlockedBy: "Your new LinkedIn profile is ready for you to see", unlocks: "The next step: your DM sequences" },
  { stage: 3, title: "Launch", unlockedBy: "Your DM sequences are ready for you to see", unlocks: "Go-live, content engine and weekly reports" },
];

/**
 * Always three stages. A stage with no row yet is locked (the work it covers has not been sent to the client yet). When the plan is known, every stage
 * shows its planned price, so the client sees what is coming; the row's own amount wins once the payment link exists.
 */
export function toStageInvoices(rows: InvoiceRow[], plan?: PlanKey): StageInvoice[] {
  return STAGES.map((s) => {
    const r = rows.find((x) => x.stage === s.stage);
    const planned = plan ? Math.round(PLANS[plan].stagePrices[s.stage - 1] * 100) : 0;
    if (!r) return { ...s, amountCents: planned, currency: "eur" };
    return {
      ...s, amountCents: r.amount_cents ?? planned, currency: r.currency.toLowerCase(), createdAt: r.created_at,
      ...(r.paid_at ? { paidAt: r.paid_at } : {}),
      ...(r.pay_url ? { payUrl: r.pay_url } : {}),
      ...(r.pdf_url ? { pdfUrl: r.pdf_url } : {}),
      // Charged automatically: the card is being charged, or the charge failed and a pay link is offered.
      ...(!r.paid_at && r.charge_attempted_at && !r.charge_error ? { charging: true } : {}),
      ...(!r.paid_at && r.charge_error ? { chargeFailed: true } : {}),
    };
  });
}
