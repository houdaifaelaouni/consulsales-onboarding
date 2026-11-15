import { redirect } from "next/navigation";
import { PaymentsBoard } from "@/components/payments/payments-board";
import { Notice } from "@/components/shell/notice";
import { t } from "@/lib/i18n";
import { getPaymentProvider } from "@/lib/payments";
import { ensureStageLinks } from "@/lib/payments/stage-links";
import { toStageInvoices } from "@/lib/payments-ui/from-db";
import type { MonthlyPlan } from "@/lib/payments-ui/types";
import { isPlanKey, PLANS, type PlanKey } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export default async function ClientPayments({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const { paid } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("membership").select("workspace_id").eq("user_id", user.id).limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;

  const { data: ws } = await supabase.from("workspace").select("plan,stage_price_cents").eq("id", workspaceId).single();
  const plan: PlanKey = isPlanKey(ws?.plan) ? ws.plan : "starter";
  const overrides = (ws?.stage_price_cents as Array<number | null> | null | undefined) ?? null;

  // Make sure every unlocked, unpaid stage has its price and secure payment link. Needs the server key and Whop; skipped quietly if missing.
  try { await ensureStageLinks({ db: createAdminClient(), provider: getPaymentProvider(), workspaceId, plan, overrides, appUrl: appUrl() }); } catch { /* not switched on yet */ }

  const { data: rows } = await supabase.from("invoice").select("stage,amount_cents,currency,created_at,paid_at,pay_url,pdf_url,charge_attempted_at,charge_error").eq("workspace_id", workspaceId);
  const monthly: MonthlyPlan = { title: "Monthly plan", amountCents: PLANS[plan].monthlyPrice * 100, currency: "eur", startsWhen: "From day 30" };
  const invoices = toStageInvoices(rows ?? [], plan, overrides);
  const confirming = !!paid && invoices.some((i) => String(i.stage) === paid && !i.paidAt);
  return <PaymentsBoard initial={invoices} monthly={monthly} now={new Date().toISOString()} live confirming={confirming} />;
}
