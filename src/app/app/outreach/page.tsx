import { redirect } from "next/navigation";
import { ConnectCard, type AccountView } from "@/components/outreach/connect-card";
import { Notice } from "@/components/shell/notice";
import { t } from "@/lib/i18n";
import { NOTICE_VERSION } from "@/lib/outreach/connect";
import { isAccountStatus } from "@/lib/outreach/status";
import { unipileBase } from "@/lib/outreach/unipile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OutreachPage({ searchParams }: { searchParams: Promise<{ connected?: string; failed?: string }> }) {
  const { connected, failed } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("membership").select("workspace_id,role").eq("user_id", user.id).limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;

  const [{ data: accounts, error }, { data: consent }] = await Promise.all([
    supabase.from("outreach_account").select("id,status").eq("workspace_id", workspaceId).order("connected_at"),
    supabase.from("outreach_consent").select("id").eq("workspace_id", workspaceId).eq("notice_version", NOTICE_VERSION).limit(1),
  ]);
  if (error) return <Notice icon="error" title={t("outreach.error.title")} body={t("outreach.error.body")} />;

  const views: AccountView[] = (accounts ?? []).flatMap((a) => (isAccountStatus(a.status) ? [{ id: a.id as string, status: a.status }] : []));
  const ready = !!unipileBase(process.env.UNIPILE_DSN) && !!process.env.UNIPILE_API_KEY && !!process.env.UNIPILE_WEBHOOK_SECRET;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{t("outreach.title")}</h1>
        <p className="text-md text-tertiary">{t("outreach.subtitle")}</p>
      </header>
      {connected && <p role="status" className="rounded-xl bg-secondary p-4 text-sm text-secondary ring-1 ring-secondary">{t("outreach.justConnected")}</p>}
      {failed && <p role="alert" className="rounded-xl bg-error-primary p-4 text-sm text-error-primary">{t("outreach.error.failed")}</p>}
      <ConnectCard accounts={views} consented={(consent ?? []).length > 0} canConnect={m?.[0]?.role === "client_owner"} ready={ready} />
    </main>
  );
}
