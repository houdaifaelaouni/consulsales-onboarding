import { redirect } from "next/navigation";
import { CampaignAccounts } from "@/components/outreach/campaign/campaign-accounts";
import { Notice } from "@/components/shell/notice";
import { t } from "@/lib/i18n";
import { DEFAULT_SETTINGS } from "@/lib/outreach/settings";
import type { ProfileView } from "@/lib/outreach/workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CampaignAccountsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("membership").select("workspace_id,role").eq("user_id", user.id).limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;

  const [accounts, assigned, links, cfg] = await Promise.all([
    supabase.from("outreach_account").select("id,unipile_account_id,status").eq("workspace_id", workspaceId),
    supabase.from("outreach_campaign_account").select("account_id").eq("workspace_id", workspaceId).eq("campaign_id", id),
    supabase.from("outreach_campaign_account").select("account_id").eq("workspace_id", workspaceId),
    supabase.from("outreach_settings").select("invites_per_day").eq("workspace_id", workspaceId).maybeSingle(),
  ]);
  if (accounts.error) return <Notice icon="error" title={t("outreach.error.title")} body={t("outreach.error.body")} />;

  const perAccount = new Map<string, number>();
  for (const link of links.data ?? []) {
    const key = link.account_id as string;
    perAccount.set(key, (perAccount.get(key) ?? 0) + 1);
  }
  const profiles: ProfileView[] = (accounts.data ?? [])
    .filter((a) => a.status === "ok")
    .map((a) => ({
      id: a.id as string,
      name: t("outreach.ac.profile", "en", { ref: String(a.unipile_account_id).slice(-6) }),
      status: "ok",
      campaigns: perAccount.get(a.id as string) ?? 0,
    }));

  return (
    <CampaignAccounts
      campaignId={id}
      profiles={profiles}
      selected={(assigned.data ?? []).map((r) => r.account_id as string)}
      perDay={cfg.data ? (cfg.data.invites_per_day as number) : DEFAULT_SETTINGS.invitesPerDay}
      campaigns={Math.max(1, ...[...perAccount.values()])}
      live
      canEdit={m?.[0]?.role === "client_owner"}
      profilesHref="/app/outreach"
    />
  );
}
