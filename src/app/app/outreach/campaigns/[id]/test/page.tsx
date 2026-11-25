import { redirect } from "next/navigation";
import { TestMode } from "@/components/outreach/campaign/test-mode";
import { Notice } from "@/components/shell/notice";
import { t } from "@/lib/i18n";
import type { StepInput } from "@/lib/outreach/campaign";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CampaignTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("membership").select("workspace_id").eq("user_id", user.id).limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;

  const { data, error } = await supabase
    .from("outreach_step").select("position,delay_days,body").eq("workspace_id", workspaceId).eq("campaign_id", id).order("position");
  if (error) return <Notice icon="error" title={t("outreach.error.title")} body={t("outreach.error.body")} />;

  const steps: StepInput[] = (data ?? []).map((s) => ({ delayDays: s.delay_days as number, body: s.body as string }));
  return <TestMode steps={steps.length >= 2 ? steps : [{ delayDays: 0, body: "" }, { delayDays: 2, body: "" }]} />;
}
