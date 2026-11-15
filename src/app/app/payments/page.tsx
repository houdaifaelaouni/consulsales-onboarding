import { redirect } from "next/navigation";
import { PaymentsBoard } from "@/components/payments/payments-board";
import { toStageInvoices } from "@/lib/payments-ui/from-db";
import type { MonthlyPlan } from "@/lib/payments-ui/types";
import { Notice } from "@/components/shell/notice";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// The monthly price is not set yet (see src/lib/plans.ts), so it shows as a dash.
const monthly: MonthlyPlan = { title: "Monthly plan", amountCents: 0, currency: "eur", startsWhen: "After stage 3 is paid" };

export default async function ClientPayments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("membership").select("workspace_id").eq("user_id", user.id).limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) {
    return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;
  }
  const { data: rows } = await supabase.from("invoice").select("stage,amount_cents,currency,created_at,paid_at,pay_url,pdf_url").eq("workspace_id", workspaceId);
  return <PaymentsBoard initial={toStageInvoices(rows ?? [])} monthly={monthly} now={new Date().toISOString()} live />;
}
