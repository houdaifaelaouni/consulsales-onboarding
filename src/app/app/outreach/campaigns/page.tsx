import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { CampaignControls } from "@/components/outreach/campaign-controls";
import { DuplicateButton } from "@/components/outreach/campaign/duplicate-button";
import { STATUS_LABEL, STATUS_TONE } from "@/components/outreach/campaign/status";
import { NewCampaignDialog } from "@/components/outreach/new-campaign-dialog";
import { PlatformDot, PlatformFilter } from "@/components/outreach/platform-pills";
import { OutreachTabs } from "@/components/outreach/tabs";
import { Notice } from "@/components/shell/notice";
import { t } from "@/lib/i18n";
import { campaignProgress } from "@/lib/outreach/analytics";
import { DEFAULT_SETTINGS, shortTime } from "@/lib/outreach/settings";
import { formatDate, type CampaignStatus, type Channel } from "@/lib/outreach/workspace";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BASE = "/app/outreach/campaigns";

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  const { platform } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("membership").select("workspace_id,role").eq("user_id", user.id).limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;
  const canEdit = m?.[0]?.role === "client_owner";

  const [camps, counts, cfg] = await Promise.all([
    supabase.from("outreach_campaign").select("id,name,description,status,channel,created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.rpc("outreach_campaign_counts", { p_ws: workspaceId }),
    supabase.from("outreach_settings").select("work_start,work_end,weekdays_only").eq("workspace_id", workspaceId).maybeSingle(),
  ]);
  if (camps.error || counts.error) return <Notice icon="error" title={t("outreach.error.title")} body={t("outreach.error.body")} />;

  const byCampaign = new Map<string, Record<string, number>>();
  for (const c of (counts.data ?? []) as Array<{ campaign_id: string; state: string; n: number }>) {
    byCampaign.set(c.campaign_id, { ...(byCampaign.get(c.campaign_id) ?? {}), [c.state]: Number(c.n) });
  }

  const all = (camps.data ?? []).map((c) => {
    const states = byCampaign.get(c.id as string) ?? {};
    const leads = Object.values(states).reduce((n, v) => n + Number(v), 0);
    return {
      id: c.id as string, name: c.name as string, description: (c.description as string | null) ?? null,
      status: c.status as CampaignStatus, channel: ((c.channel as string | null) ?? "LINKEDIN").toLowerCase() as Channel,
      createdAt: c.created_at as string, leads,
      progress: campaignProgress(Number(states.completed ?? 0), leads),
    };
  });
  const active = platform && platform !== "all" ? all.filter((c) => c.channel === platform) : all;
  const platformCounts = { all: all.length, linkedin: all.filter((c) => c.channel === "linkedin").length };
  const hours = cfg.data ? `${shortTime(cfg.data.work_start as string)} – ${shortTime(cfg.data.work_end as string)}` : `${DEFAULT_SETTINGS.workStart} – ${DEFAULT_SETTINGS.workEnd}`;
  const days = cfg.data?.weekdays_only ? t("outreach.cl.weekdays") : t("outreach.cl.everyDay");

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-display-sm font-semibold text-primary">{t("outreach.cl.title")}</h1>
            <p className="text-md text-tertiary">{t("outreach.cl.subtitle")}</p>
          </div>
          <NewCampaignDialog base={BASE} live canEdit={canEdit} hours={hours} days={days} sessions={t("outreach.cl.sessions")} />
        </div>
        <OutreachTabs current="campaigns" />
        <PlatformFilter current={(platform as Channel | "all") ?? "all"} href={(c) => `${BASE}?platform=${c}`} counts={platformCounts} />
      </header>

      {active.length === 0 ? (
        <p className="rounded-2xl border border-secondary bg-primary p-8 text-center text-sm text-tertiary">
          {all.length === 0 ? t("outreach.cl.none") : t("outreach.cl.nonePlatform")}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {active.map((c) => (
            <li key={c.id} className="flex flex-col gap-4 rounded-2xl border border-secondary bg-primary p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary"><PlatformDot channel={c.channel} className="size-4" /></span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`${BASE}/${c.id}`} className="text-md font-semibold text-primary hover:underline">{c.name}</Link>
                      <Badge size="sm" color="gray">{t(c.channel === "linkedin" ? "outreach.ch.linkedin" : "outreach.ch.linkedin")}</Badge>
                      <Badge size="sm" color={STATUS_TONE[c.status]}>{t(STATUS_LABEL[c.status])}</Badge>
                    </div>
                    <p className="text-sm text-tertiary">{c.description ?? t("outreach.cl.noDescription")}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {c.status === "draft" && canEdit && (
                    <Link href={`${BASE}/${c.id}/build`} className="rounded-lg bg-brand-solid px-3 py-2 text-sm font-semibold text-white">{t("outreach.camp.editLink")}</Link>
                  )}
                  <DuplicateButton id={c.id} canEdit={canEdit} />
                  {(c.status === "active" || c.status === "paused") && (
                    <CampaignControls id={c.id} status={c.status} canEdit={canEdit} />
                  )}
                  <Link href={`${BASE}/${c.id}`} aria-label={t("outreach.cl.open")}
                    className="grid size-9 place-items-center rounded-lg border border-secondary text-secondary hover:bg-secondary">
                    <ChevronRight aria-hidden className="size-4" />
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-tertiary">
                  <span>{t("outreach.cl.progress", "en", { n: c.progress })}</span>
                  <span>{t("outreach.cl.leadsCreated", "en", { n: new Intl.NumberFormat("en-US").format(c.leads) })}</span>
                </div>
                <ProgressBarBase value={c.progress} max={100} aria-label={t("outreach.cl.progress", "en", { n: c.progress })} />
              </div>

              <p className="text-xs text-tertiary">{t("outreach.cl.created", "en", { date: formatDate(c.createdAt) })}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
