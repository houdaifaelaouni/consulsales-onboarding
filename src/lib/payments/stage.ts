import { amountAtLeast } from "./classify";
import type { NormalizedPayment } from "./types";

/** Storage port for settling a stage payment, so the rules can be tested without a database. */
export interface StageRepo {
  getInvoice(workspaceId: string, stage: number): Promise<{ amountCents: number | null; paid: boolean } | null>;
  /** Marks it paid. Returns false when it was already paid (or does not exist). */
  markPaid(workspaceId: string, stage: number): Promise<boolean>;
  logPaid(workspaceId: string, stage: number, paymentId: string): Promise<void>;
  /** The card was declined (or the charge failed) after we asked. Only a short reason is kept. */
  markChargeFailed(workspaceId: string, stage: number, reason: string): Promise<void>;
}

export type StageResult = "paid" | "already_paid" | "rejected";

/**
 * A stage payment arrived. Only an invoice that was really unlocked (a row exists) and priced by us can be paid, and what was
 * paid must cover it. Safe to repeat: a second delivery finds it already paid.
 */
export async function settleStage(repo: StageRepo, payment: NormalizedPayment, workspaceId: string, stage: number): Promise<StageResult> {
  const inv = await repo.getInvoice(workspaceId, stage);
  if (!inv || inv.amountCents === null) return "rejected";
  if (inv.paid) return "already_paid";
  if (!amountAtLeast(payment.amount, inv.amountCents / 100)) return "rejected";
  if (!(await repo.markPaid(workspaceId, stage))) return "already_paid";
  await repo.logPaid(workspaceId, stage, payment.paymentId);
  return "paid";
}
