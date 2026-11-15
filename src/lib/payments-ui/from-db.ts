import type { StageInvoice } from "./types";

export interface InvoiceRow { stage: number; amount_cents: number | null; currency: string; created_at: string; paid_at: string | null; pay_url: string | null; pdf_url: string | null }

/** What each stage is and what unlocks it. Copy matches the product promise: you never pay ahead of the work. */
const STAGES: Array<Pick<StageInvoice, "stage" | "title" | "unlockedBy" | "unlocks">> = [
  { stage: 1, title: "Foundation", unlockedBy: "You paid at checkout", unlocks: "Your workspace and kickoff" },
  { stage: 2, title: "Build", unlockedBy: "You approve your ideal client profile", unlocks: "Profile rewrite, lead lists and message sequences" },
  { stage: 3, title: "Launch", unlockedBy: "You approve your profile and first messages", unlocks: "Go-live, content engine and weekly reports" },
];

/** Always three stages. A stage with no row yet is locked (the work has not been approved). */
export function toStageInvoices(rows: InvoiceRow[]): StageInvoice[] {
  return STAGES.map((s) => {
    const r = rows.find((x) => x.stage === s.stage);
    if (!r) return { ...s, amountCents: 0, currency: "eur" };
    return {
      ...s, amountCents: r.amount_cents ?? 0, currency: r.currency.toLowerCase(), createdAt: r.created_at,
      ...(r.paid_at ? { paidAt: r.paid_at } : {}),
      ...(r.pay_url ? { payUrl: r.pay_url } : {}),
      ...(r.pdf_url ? { pdfUrl: r.pdf_url } : {}),
    };
  });
}
