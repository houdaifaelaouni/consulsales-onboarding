import { redirect } from "next/navigation";
import { AnalyticsGrid } from "@/components/outreach/campaign/analytics-grid";
import { QueueStatus } from "@/components/outreach/campaign/queue-status";
import { Notice } from "@/components/shell/notice";
import { t } from "@/lib/i18n";
import { queueStatus, type CampaignCounts } from "@/lib/outreach/analytics";
import type { Channel } from "@/lib/outreach/workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const num = (value: unknown) => (typeof value === "number" ? value : Number(value ?? 0) || 0);

export default async function CampaignOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("membership").select("workspace_id").eq("user_id", user.id).limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;

  const [analytics, campaign] = await Promise.all([
    supabase.rpc("outreach_campaign_analytics", { p_ws: workspaceId, p_campaign: id }),
    supabase.from("outreach_campaign").select("channel").eq("workspace_id", workspaceId).eq("id", id).maybeSingle(),
  ]);
  if (analytics.error) return <Notice icon="error" title={t("outreach.error.title")} body={t("outreach.error.body")} />;

  const raw = (analytics.data ?? {}) as Record<string, unknown>;
  const counts: CampaignCounts = {
    leads: num(raw.leads), invites: num(raw.invites), messages: num(raw.messages), accepted: num(raw.accepted),
    replies: num(raw.replies), positive: num(raw.positive), conversations: num(raw.conversations), meetings: num(raw.meetings),
    completed: num(raw.completed), failed: num(raw.failed), stopped: num(raw.stopped), failedSends: num(raw.failedSends),
  };
  const steps = Array.isArray(raw.steps) ? (raw.steps as Array<{ step: number; leads: number }>) : [];
  const queue = queueStatus({
    pending: num(raw.pending), inProgress: num(raw.inProgress), completed: counts.completed, failed: counts.failed, steps,
  });
  const channel = (((campaign.data?.channel as string | null) ?? "LINKEDIN").toLowerCase()) as Channel;

  return (
    <div className="flex flex-col gap-4">
      <AnalyticsGrid counts={counts} channel={channel} />
      <QueueStatus queue={queue} live />
    </div>
  );
}
