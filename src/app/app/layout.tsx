import { redirect } from "next/navigation";
import { PayToEnter } from "@/components/payments/pay-to-enter";
import { AreaSwitch } from "@/components/shell/area-switch";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { isStaff } from "@/lib/auth/access";
import { getViewer } from "@/lib/auth/viewer";
import { firstName } from "@/lib/home";
import { APP_NAV } from "@/lib/nav";
import { getPaymentProvider } from "@/lib/payments";
import { mayEnter } from "@/lib/payments/entry";
import { ensureEntryInvoice, ensureStageLinks } from "@/lib/payments/stage-links";
import { isPlanKey, PLANS, stagePrice, type PlanKey } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

/** Client side. No payment, no workspace: a client whose stage 1 is unpaid sees only the pay screen. Staff (the founder, admins,
 * delivery leads) never pay and are never stopped here; they also get a link to the admin side. */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const supabase = await createClient();
  const { data: m } = await supabase.from("membership").select("workspace_id").eq("user_id", viewer.id).eq("role", "client_owner").limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (workspaceId && !isStaff(viewer)) {
    const [{ data: inv }, { data: ws }] = await Promise.all([
      supabase.from("invoice").select("stage,paid_at,pay_url,provider_invoice_id").eq("workspace_id", workspaceId),
      supabase.from("workspace").select("plan,company,stage_price_cents,trial_until").eq("id", workspaceId).single(),
    ]);
    if (!mayEnter(inv, (ws?.trial_until as string | null | undefined) ?? null, new Date())) {
      const entry = inv?.find((r) => r.stage === 1);
      let payUrl = (entry?.pay_url as string | null | undefined) ?? null;
      let checkoutId = (entry?.provider_invoice_id as string | null | undefined) ?? null;
      const plan: PlanKey = isPlanKey(ws?.plan) ? ws.plan : "starter";
      const overrides = (ws?.stage_price_cents as Array<number | null> | null | undefined) ?? null;
      if (!payUrl) {
        try {
          const db = createAdminClient();
          await ensureEntryInvoice(db, workspaceId);
          await ensureStageLinks({ db, provider: getPaymentProvider(), workspaceId, plan, overrides, appUrl: appUrl() });
          const { data: again } = await supabase.from("invoice").select("pay_url,provider_invoice_id").eq("workspace_id", workspaceId).eq("stage", 1).maybeSingle();
          payUrl = (again?.pay_url as string | null | undefined) ?? null;
          checkoutId = (again?.provider_invoice_id as string | null | undefined) ?? null;
        } catch { /* Whop or the server key is not set up yet: the screen says so */ }
      }
      const cfg = PLANS[plan];
      return (
        <PayToEnter
          amount={`€${stagePrice(plan, 1, overrides)}`} nextAmount={`€${stagePrice(plan, 2, overrides)}`} planTitle={cfg.title}
          holder={viewer.name || firstName(viewer.name, viewer.email)} company={(ws?.company as string | undefined) ?? ""} email={viewer.email}
          checkoutId={checkoutId} payUrl={payUrl}
        />
      );
    }
  }

  return (
    <DashboardShell
      items={APP_NAV} homeHref="/app" user={{ name: firstName(viewer.name, viewer.email), email: viewer.email }} canSignOut
      footer={isStaff(viewer) ? <AreaSwitch to="admin" /> : undefined}
    >
      {children}
    </DashboardShell>
  );
}
