/** Provider-neutral invoice shape for the screen. The payment provider (Whop) fills these from its own records. */
export type InvoiceStatus = "locked" | "due" | "paid" | "overdue";

export interface StageInvoice {
  stage: 1 | 2 | 3;
  title: string;
  /** Amount in minor units (cents) to avoid float rounding. */
  amountCents: number;
  currency: string;
  /** What the client did to unlock this invoice, or must do to unlock it. */
  unlockedBy: string;
  /** What paying it unlocks next. */
  unlocks: string;
  /** Set when the invoice was created (i.e. the gating deliverable was approved). */
  createdAt?: string;
  paidAt?: string;
  /** Hosted payment page and PDF, provided by the payment provider. */
  payUrl?: string;
  pdfUrl?: string;
}

export interface MonthlyPlan {
  title: string;
  amountCents: number;
  currency: string;
  startsWhen: string;
}
