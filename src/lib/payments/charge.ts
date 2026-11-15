import { PLANS, type PlanKey } from "@/lib/plans";
import type { PaymentProvider } from "./types";

export const MAX_CHARGE_ATTEMPTS = 3;
/** A failed charge may be tried again after this long. */
export const RETRY_AFTER_HOURS = 24;

export interface DueInvoice { stage: 2 | 3; attempts: number; attemptedAt: string | null; failed: boolean }

/** What the charge engine needs from storage, so the rules can be tested without a database. */
export interface ChargeRepo {
  /** The plan and the saved card ids, or null when the workspace has no saved card. */
  loadAccount(workspaceId: string): Promise<{ plan: PlanKey; memberId: string; paymentMethodId: string } | null>;
  /** Unpaid stage 2 and 3 invoices of the workspace. */
  listUnpaid(workspaceId: string): Promise<DueInvoice[]>;
  /**
   * Atomically takes the right to charge this invoice (sets the price, counts the attempt, clears the last error).
   * Returns false when someone else already took it, so two workers can never charge the same invoice.
   */
  claim(workspaceId: string, stage: number, amountCents: number, currency: string, retryBefore: string): Promise<boolean>;
  recordFailure(workspaceId: string, stage: number, reason: string): Promise<void>;
}

/** An invoice may be charged now: never tried, or its last try failed long enough ago, and not out of attempts. */
export function isDue(inv: DueInvoice, now: Date): boolean {
  if (inv.attempts >= MAX_CHARGE_ATTEMPTS) return false;
  if (inv.attemptedAt === null) return true;
  if (!inv.failed) return false; // a charge is in flight; its result arrives as a webhook
  return now.getTime() - Date.parse(inv.attemptedAt) >= RETRY_AFTER_HOURS * 3_600_000;
}

export interface ChargeOutcome { stage: number; result: "charging" | "skipped" | "failed" }

/**
 * Charges the saved card for every stage that is due. Called right after the work becomes visible, and again by a daily job
 * for retries. The result of a charge arrives later as a webhook, which marks the invoice paid or failed.
 */
export async function chargeDueInvoices(deps: { repo: ChargeRepo; provider: PaymentProvider; now?: Date }, workspaceId: string): Promise<ChargeOutcome[]> {
  const { repo, provider } = deps;
  const now = deps.now ?? new Date();
  const account = await repo.loadAccount(workspaceId);
  if (!account) return []; // no saved card: the client pays by link instead
  const cfg = PLANS[account.plan];
  const out: ChargeOutcome[] = [];

  for (const inv of await repo.listUnpaid(workspaceId)) {
    if (!isDue(inv, now)) { out.push({ stage: inv.stage, result: "skipped" }); continue; }
    const amount = cfg.stagePrices[inv.stage - 1];
    const retryBefore = new Date(now.getTime() - RETRY_AFTER_HOURS * 3_600_000).toISOString();
    if (!(await repo.claim(workspaceId, inv.stage, Math.round(amount * 100), cfg.currency, retryBefore))) { out.push({ stage: inv.stage, result: "skipped" }); continue; }
    try {
      await provider.chargeSavedMethod({
        memberId: account.memberId, paymentMethodId: account.paymentMethodId, amount, currency: cfg.currency,
        title: `ConsulSales setup, stage ${inv.stage}`,
        metadata: { kind: "stage", workspace_id: workspaceId, stage: String(inv.stage) },
      });
      out.push({ stage: inv.stage, result: "charging" });
    } catch {
      await repo.recordFailure(workspaceId, inv.stage, "charge_request_failed");
      out.push({ stage: inv.stage, result: "failed" });
    }
  }
  return out;
}
