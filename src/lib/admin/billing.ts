import { stagePrice, type PlanKey, type StageOverrides } from "@/lib/plans";

export type BillingStatus = "paid" | "waived" | "charging" | "billed" | "not_billed";

export interface BillingInvoice { stage: number; paid_at: string | null; waived?: boolean | null; charge_attempted_at?: string | null; charge_error?: string | null }

export interface BillingRow {
  stage: 1 | 2 | 3;
  planCents: number;
  priceCents: number;
  custom: boolean;
  status: BillingStatus;
  /** Price and waiver can no longer change: already paid or waived, or a charge is waiting for its answer. */
  locked: boolean;
}

/** One row per stage for the admin billing controls. Pure, so it is easy to test. */
export function billingRows(plan: PlanKey, overrides: StageOverrides, invoices: BillingInvoice[]): BillingRow[] {
  return ([1, 2, 3] as const).map((stage) => {
    const inv = invoices.find((i) => i.stage === stage);
    const status: BillingStatus = !inv ? "not_billed"
      : inv.paid_at ? (inv.waived ? "waived" : "paid")
      : inv.charge_attempted_at && !inv.charge_error ? "charging"
      : "billed";
    return {
      stage,
      planCents: Math.round(stagePrice(plan, stage) * 100),
      priceCents: Math.round(stagePrice(plan, stage, overrides) * 100),
      custom: typeof overrides?.[stage - 1] === "number",
      status,
      locked: status === "paid" || status === "waived" || status === "charging",
    };
  });
}

/** Euros typed by an admin ("600", "600.50", "600,50") to cents; null when it is not a valid price. */
export function parseEuros(input: string): number | null {
  const v = Number(input.trim().replace(",", "."));
  if (!Number.isFinite(v) || v < 1 || v > 100000) return null;
  return Math.round(v * 100);
}
