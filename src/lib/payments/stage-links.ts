import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanKey } from "@/lib/plans";
import type { PaymentProvider } from "./types";

type Db = ReturnType<typeof createAdminClient>;

/**
 * Gives every unlocked, unpaid invoice (stage 1 to open the workspace, 2 and 3 when approved) its price and its secure payment link. Called when the client opens the
 * payments page, so a link exists the moment the work is approved. Only fills what is empty, so repeating it is harmless.
 */
export async function ensureStageLinks(opts: { db: Db; provider: PaymentProvider; workspaceId: string; plan: PlanKey; appUrl: string }): Promise<void> {
  const { db, provider, workspaceId, plan, appUrl } = opts;
  // With a saved card the charge is automatic, so a pay link is only offered after a charge failed (never both at once, so no
  // double payment). Without a saved card the client pays by link.
  const { data: bill } = await db.from("billing_account").select("workspace_id").eq("workspace_id", workspaceId).maybeSingle();
  // Stage 1 (entry) is always paid by link: there is no card yet.
  let q = db.from("invoice").select("stage").eq("workspace_id", workspaceId).is("paid_at", null).is("pay_url", null);
  if (bill) q = q.or("stage.eq.1,charge_error.not.is.null");
  const { data: rows, error } = await q;
  if (error || !rows?.length) return;
  const cfg = PLANS[plan];
  for (const { stage } of rows as Array<{ stage: number }>) {
    const amount = cfg.stagePrices[stage - 1];
    if (!amount) continue;
    try {
      const checkout = await provider.createCheckout({
        plan, title: `ConsulSales setup, stage ${stage}`, amount, currency: cfg.currency,
        redirectUrl: stage === 1 ? `${appUrl}/app` : `${appUrl}/app/payments?paid=${stage}`,
        metadata: { kind: "stage", workspace_id: workspaceId, stage: String(stage) },
      });
      // Only the first writer wins; a second page view that raced us simply leaves its link unused.
      await db.from("invoice").update({ amount_cents: Math.round(amount * 100), currency: cfg.currency, pay_url: checkout.url, provider_invoice_id: checkout.id })
        .eq("workspace_id", workspaceId).eq("stage", stage).is("pay_url", null);
    } catch {
      // Whop not set up yet, or briefly down: the page shows "not switched on" and the next visit tries again.
    }
  }
}

/** A workspace that has not paid for entry gets its stage 1 invoice row (idempotent), so it can be given a pay link. */
export async function ensureEntryInvoice(db: Db, workspaceId: string): Promise<void> {
  await db.from("invoice").upsert({ workspace_id: workspaceId, stage: 1 }, { onConflict: "workspace_id,stage", ignoreDuplicates: true });
}
