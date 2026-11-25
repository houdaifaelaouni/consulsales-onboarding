import Link from "next/link";
import { ChevronRight } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { STATUS_LABEL, STATUS_TONE } from "@/components/outreach/campaign/status";
import { NewCampaignDialog } from "@/components/outreach/new-campaign-dialog";
import { PlatformDot, PlatformFilter } from "@/components/outreach/platform-pills";
import { t } from "@/lib/i18n";
import { DEMO_CAMPAIGNS } from "@/lib/outreach/sample";
import { formatDate, type Channel } from "@/lib/outreach/workspace";

export const metadata = { title: "Outreach demo" };

const BASE = "/demo/outreach/campaigns";

export default async function DemoOutreach({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  const { platform } = await searchParams;
  const current = ((platform ?? "all") as Channel | "all");
  const shown = current === "all" ? DEMO_CAMPAIGNS : DEMO_CAMPAIGNS.filter((c) => c.channel === current);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-display-sm font-semibold text-primary">{t("outreach.cl.title")}</h1>
            <p className="text-md text-tertiary">{t("outreach.cl.subtitle")}</p>
          </div>
          <NewCampaignDialog base={BASE} live={false} canEdit hours="08:00 – 18:00" days={t("outreach.cl.everyDay")} sessions={t("outreach.cl.sessions")} />
        </div>
        <PlatformFilter current={current} href={(c) => `/demo/outreach?platform=${c}`} counts={{ all: DEMO_CAMPAIGNS.length, linkedin: DEMO_CAMPAIGNS.length }} />
      </header>

      <ul className="flex flex-col gap-4">
        {shown.map((c) => (
          <li key={c.id} className="flex flex-col gap-4 rounded-2xl border border-secondary bg-primary p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary"><PlatformDot channel={c.channel} className="size-4" /></span>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`${BASE}/${c.id}`} className="text-md font-semibold text-primary hover:underline">{c.name}</Link>
                    <Badge size="sm" color="gray">{t("outreach.ch.linkedin")}</Badge>
                    <Badge size="sm" color={STATUS_TONE[c.status]}>{t(STATUS_LABEL[c.status])}</Badge>
                  </div>
                  <p className="text-sm text-tertiary">{c.description ?? t("outreach.cl.noDescription")}</p>
                </div>
              </div>
              <Link href={`${BASE}/${c.id}`} aria-label={t("outreach.cl.open")}
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-secondary text-secondary hover:bg-secondary">
                <ChevronRight aria-hidden className="size-4" />
              </Link>
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
    </main>
  );
}
