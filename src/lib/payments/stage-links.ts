import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanKey } from "@/lib/plans";
import type { PaymentProvider } from "./types";

type Db = ReturnType<typeof createAdminClient>;

/**
 * Gives every unlocked, unpaid stage 2 or 3 invoice its price and its secure payment link. Called when the client opens the
 * payments page, so a link exists the moment the work is approved. Only fills what is empty, so repeating it is harmless.
 */
export async function ensureStageLinks(opts: { db: Db; provider: PaymentProvider; workspaceId: string; plan: PlanKey; appUrl: string }): Promise<void> {
  const { db, provider, workspaceId, plan, appUrl } = opts;
  const { data: rows, error } = await db.from("invoice").select("stage").eq("workspace_id", workspaceId).gt("stage", 1).is("paid_at", null).is("pay_url", null);
  if (error || !rows?.length) return;
  const cfg = PLANS[plan];
  for (const { stage } of rows as Array<{ stage: number }>) {
    const amount = cfg.stagePrices[stage - 1];
    if (!amount) continue;
    try {
      const checkout = await provider.createCheckout({
        plan, title: `ConsulSales setup, stage ${stage}`, amount, currency: cfg.currency,
        redirectUrl: `${appUrl}/app/payments?paid=${stage}`,
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
