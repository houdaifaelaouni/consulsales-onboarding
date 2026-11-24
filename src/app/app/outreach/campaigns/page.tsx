import { redirect } from "next/navigation";
import { Badge } from "@/components/base/badges/badges";
import { CampaignBuilder } from "@/components/outreach/campaign-builder";
import { CampaignControls } from "@/components/outreach/campaign-controls";
import { OutreachTabs } from "@/components/outreach/tabs";
import { Notice } from "@/components/shell/notice";
import { t } from "@/lib/i18n";
import type { StepInput } from "@/lib/outreach/campaign";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_COLOR = { draft: "gray", active: "success", paused: "warning", completed: "gray" } as const;
const STATUS_KEY = { draft: "outreach.camp.s.draft", active: "outreach.camp.s.active", paused: "outreach.camp.s.paused", completed: "outreach.camp.s.completed" } as const;
const STATES = ["active", "replied", "completed", "stopped", "failed"] as const;
const STATE_KEY = { active: "outreach.camp.n.active", replied: "outreach.camp.n.replied", completed: "outreach.camp.n.completed", stopped: "outreach.camp.n.stopped", failed: "outreach.camp.n.failed" } as const;
const DEFAULT_PER_DAY = 12;

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("membership").select("workspace_id,role").eq("user_id", user.id).limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;
  const canEdit = m?.[0]?.role === "client_owner";

  const [camps, counts, ready, cfg, sent] = await Promise.all([
    supabase.from("outreach_campaign").select("id,name,status,created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.rpc("outreach_campaign_counts", { p_ws: workspaceId }),
    supabase.rpc("outreach_unenrolled_approved", { p_ws: workspaceId }),
    supabase.from("outreach_settings").select("invites_per_day").eq("workspace_id", workspaceId).maybeSingle(),
    supabase.rpc("outreach_send_counts", { p_ws: workspaceId }),
  ]);
  if (camps.error || counts.error || ready.error) return <Notice icon="error" title={t("outreach.error.title")} body={t("outreach.error.body")} />;
  const perDay = cfg.error || !cfg.data ? DEFAULT_PER_DAY : (cfg.data.invites_per_day as number);
  const today = (sent.data ?? {}) as { invites?: number; messages?: number };

  let editing: { id: string; name: string; steps: StepInput[] } | null = null;
  if (edit && canEdit) {
    const draft = (camps.data ?? []).find((c) => c.id === edit && c.status === "draft");
    if (draft) {
      const { data: st } = await supabase.from("outreach_step").select("position,delay_days,body").eq("campaign_id", draft.id as string).order("position");
      editing = { id: draft.id as string, name: draft.name as string, steps: (st ?? []).map((s) => ({ delayDays: s.delay_days as number, body: s.body as string })) };
    }
  }
  const byCampaign = new Map<string, Record<string, number>>();
  for (const c of (counts.data ?? []) as Array<{ campaign_id: string; state: string; n: number }>) byCampaign.set(c.campaign_id, { ...(byCampaign.get(c.campaign_id) ?? {}), [c.state]: Number(c.n) });

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-display-sm font-semibold text-primary">{t("outreach.camp.title")}</h1>
          <p className="text-md text-tertiary">{t("outreach.camp.subtitle")}</p>
        </div>
        <OutreachTabs current="campaigns" />
        <p role="status" className="text-sm text-tertiary">{t("outreach.camp.today", "en", { invites: today.invites ?? 0, messages: today.messages ?? 0 })}</p>
      </header>

      <CampaignBuilder key={editing?.id ?? "new"} id={editing?.id ?? null} initialName={editing?.name ?? ""} initialSteps={editing?.steps ?? null} approvedLeads={Number(ready.data ?? 0)} perDay={perDay} canEdit={canEdit} />

      <section aria-labelledby="camp-list" className="flex flex-col gap-3">
        <h2 id="camp-list" className="text-lg font-semibold text-primary">{t("outreach.camp.list")}</h2>
        {(camps.data ?? []).length === 0 ? <p role="status" className="rounded-xl bg-secondary p-4 text-sm text-secondary">{t("outreach.camp.none")}</p> : (
          <ul className="flex flex-col gap-3">
            {(camps.data ?? []).map((c) => {
              const n = byCampaign.get(c.id as string) ?? {};
              const status = c.status as keyof typeof STATUS_KEY;
              return (
                <li key={c.id as string} className="flex flex-col gap-3 rounded-xl bg-primary p-5 ring-1 ring-secondary">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-md font-semibold text-primary">{c.name as string}</span>
                    <Badge size="sm" color={STATUS_COLOR[status]}>{t(STATUS_KEY[status])}</Badge>
                  </div>
                  {status !== "draft" && (
                    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                      {STATES.map((s) => <div key={s}><dt className="text-tertiary">{t(STATE_KEY[s])}</dt><dd className="font-semibold text-primary">{n[s] ?? 0}</dd></div>)}
                    </dl>
                  )}
                  {status === "draft" && canEdit && <a className="text-sm font-semibold text-brand-secondary underline" href={`/app/outreach/campaigns?edit=${c.id as string}`}>{t("outreach.camp.editLink")}</a>}
                  {(status === "active" || status === "paused") && <CampaignControls id={c.id as string} status={status} canEdit={canEdit} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
