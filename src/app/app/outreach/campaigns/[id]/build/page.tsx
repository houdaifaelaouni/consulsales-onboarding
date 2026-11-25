import { redirect } from "next/navigation";
import { FlowCanvas } from "@/components/outreach/campaign/flow-canvas";
import { Notice } from "@/components/shell/notice";
import { t } from "@/lib/i18n";
import type { StepInput } from "@/lib/outreach/campaign";
import { buildFlow } from "@/lib/outreach/flow";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const START: StepInput[] = [{ delayDays: 0, body: "" }, { delayDays: 2, body: "" }];

export default async function CampaignBuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("membership").select("workspace_id,role").eq("user_id", user.id).limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;

  const [campaign, steps, ready] = await Promise.all([
    supabase.from("outreach_campaign").select("name,status").eq("workspace_id", workspaceId).eq("id", id).maybeSingle(),
    supabase.from("outreach_step").select("position,delay_days,body").eq("workspace_id", workspaceId).eq("campaign_id", id).order("position"),
    supabase.rpc("outreach_unenrolled_approved", { p_ws: workspaceId }),
  ]);
  if (campaign.error) return <Notice icon="error" title={t("outreach.error.title")} body={t("outreach.error.body")} />;

  const saved: StepInput[] = (steps.data ?? []).map((s) => ({ delayDays: s.delay_days as number, body: s.body as string }));
  const list = saved.length >= 2 ? saved : START;
  const canEdit = m?.[0]?.role === "client_owner" && campaign.data?.status === "draft";

  return (
    <FlowCanvas
      graph={buildFlow(list)} steps={list} campaignId={id} name={(campaign.data?.name as string) ?? ""}
      approvedLeads={Number(ready.data ?? 0)} canEdit={canEdit} live
    />
  );
}
