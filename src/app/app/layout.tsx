import { redirect } from "next/navigation";
import { PayToEnter } from "@/components/payments/pay-to-enter";
import { AreaSwitch } from "@/components/shell/area-switch";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { isStaff } from "@/lib/auth/access";
import { getViewer } from "@/lib/auth/viewer";
import { firstName } from "@/lib/home";
import { APP_NAV } from "@/lib/nav";
import { getPaymentProvider } from "@/lib/payments";
import { hasPaidEntry } from "@/lib/payments/entry";
import { ensureEntryInvoice, ensureStageLinks } from "@/lib/payments/stage-links";
import { isPlanKey, PLANS, type PlanKey } from "@/lib/plans";
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
    const { data: inv } = await supabase.from("invoice").select("stage,paid_at,pay_url").eq("workspace_id", workspaceId);
    if (!hasPaidEntry(inv)) {
      let payUrl = (inv?.find((r) => r.stage === 1)?.pay_url as string | null | undefined) ?? null;
      const { data: ws } = await supabase.from("workspace").select("plan").eq("id", workspaceId).single();
      const plan: PlanKey = isPlanKey(ws?.plan) ? ws.plan : "starter";
      if (!payUrl) {
        try {
          const db = createAdminClient();
          await ensureEntryInvoice(db, workspaceId);
          await ensureStageLinks({ db, provider: getPaymentProvider(), workspaceId, plan, appUrl: appUrl() });
          const { data: again } = await supabase.from("invoice").select("pay_url").eq("workspace_id", workspaceId).eq("stage", 1).maybeSingle();
          payUrl = (again?.pay_url as string | null | undefined) ?? null;
        } catch { /* Whop or the server key is not set up yet: the screen says so */ }
      }
      return <PayToEnter amount={`€${PLANS[plan].stagePrices[0]}`} payUrl={payUrl} />;
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
