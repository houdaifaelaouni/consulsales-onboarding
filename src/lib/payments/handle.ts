import { PLANS } from "@/lib/plans";
import { amountAtLeast, classifyPayment } from "./classify";
import { settleStage, type StageRepo } from "./stage";
import type { NormalizedPayment } from "./types";

export interface HandleDeps {
  env: Record<string, string | undefined>;
  stageRepo: StageRepo;
  /** Creates the workspace for a first payment. Resolves to its status. */
  provision: (payment: NormalizedPayment) => Promise<{ status: string }>;
}

export interface HandleResult { status: number; body: Record<string, unknown> }

/**
 * One paid payment in, one answer for Whop out. Anything we cannot recognise or that does not cover its price answers 422, so the
 * failed delivery is visible in the Whop dashboard instead of silently succeeding.
 */
/** A charge we asked for was declined. Remember it so the page can offer a secure pay link and the daily job can retry. */
export async function handleFailedPayment(deps: HandleDeps, payment: NormalizedPayment, reason: string): Promise<HandleResult> {
  const kind = classifyPayment(payment, deps.env);
  if (kind.type !== "stage") return { status: 200, body: { ok: true, ignored: "not a stage payment" } };
  await deps.stageRepo.markChargeFailed(kind.workspaceId, kind.stage, reason);
  return { status: 200, body: { ok: true, result: "failure_recorded" } };
}

export async function handlePayment(deps: HandleDeps, payment: NormalizedPayment): Promise<HandleResult> {
  const kind = classifyPayment(payment, deps.env);
  if (kind.type === "unknown") return { status: 422, body: { error: "unrecognised payment", reason: kind.reason } };

  if (kind.type === "stage") {
    const r = await settleStage(deps.stageRepo, payment, kind.workspaceId, kind.stage);
    return r === "rejected" ? { status: 422, body: { error: "stage payment rejected" } } : { status: 200, body: { ok: true, result: r } };
  }

  if (!amountAtLeast(payment.amount, PLANS[kind.plan].stagePrices[0])) return { status: 422, body: { error: "amount below the stage 1 price" } };
  const result = await deps.provision({ ...payment, metadata: { ...payment.metadata, plan: kind.plan } });
  return { status: 200, body: { ok: true, result: result.status } };
}
