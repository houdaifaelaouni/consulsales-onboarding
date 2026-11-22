import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { DEMO_MILESTONES, DEMO_QUIET, DEMO_RATES } from "@/lib/agency/sample";
import { t } from "@/lib/i18n";
import { cx } from "@/utils/cx";

const MILESTONE_KEYS = {
  admin: "retention.m.admin", kickoff: "retention.m.kickoff", first: "retention.m.first", d30: "retention.m.d30", d60: "retention.m.d60", d90: "retention.m.d90",
} as const;
const STATUS_COLOR = { done: "success", current: "brand", upcoming: "gray" } as const;
const STATUS_KEY = { done: "retention.status.done", current: "retention.status.current", upcoming: "retention.status.upcoming" } as const;
const PLAN = ["retention.plan.1", "retention.plan.2", "retention.plan.3"] as const;
const FEE = 7;

/** The 30/60/90 room on sample data: where a client stands, the numbers, the next 30 days and who is going quiet. */
export function RetentionDemo() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{t("retention.title")}</h1>
        <p className="text-md text-tertiary">{t("retention.subtitle", "en", { company: "Acme Robotics", day: 34 })}</p>
      </header>

      <section aria-labelledby="ret-timeline" className="flex flex-col gap-3">
        <h2 id="ret-timeline" className="text-lg font-semibold text-primary">{t("retention.timeline")}</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {DEMO_MILESTONES.map((m) => (
            <li key={m.key} className={cx("flex flex-col gap-2 rounded-xl bg-primary p-4 ring-1", m.status === "current" ? "ring-brand" : "ring-secondary")}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-primary">{t(MILESTONE_KEYS[m.key as keyof typeof MILESTONE_KEYS])}</span>
                <Badge size="sm" color={STATUS_COLOR[m.status]}>{t(STATUS_KEY[m.status])}</Badge>
              </div>
              <span className="text-sm text-tertiary">{m.day}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label={t("retention.rates")}>
        <StatCard label={t("retention.acceptance")} value={`${DEMO_RATES.acceptance}%`} />
        <StatCard label={t("retention.reply")} value={`${DEMO_RATES.reply}%`} hint={t("retention.target", "en", { range: DEMO_RATES.targetReply })} />
        <StatCard label={t("retention.meetings")} value={String(DEMO_RATES.meetings)} />
      </section>

      <section aria-labelledby="ret-next" className="flex flex-col gap-3 rounded-xl bg-primary p-6 ring-1 ring-secondary">
        <h2 id="ret-next" className="text-md font-semibold text-primary">{t("retention.next30")}</h2>
        <ul className="flex flex-col gap-2 text-sm text-secondary">
          {PLAN.map((k) => <li key={k}>{t(k)}</li>)}
        </ul>
        <div className="flex flex-wrap items-center gap-3 border-t border-secondary pt-3">
          <p className="text-sm text-tertiary">{t("retention.nextCheckin", "en", { date: "27 Nov 2026" })}</p>
          <Button size="sm" color="secondary">{t("retention.schedule")}</Button>
        </div>
      </section>

      <section aria-labelledby="ret-quiet" className="flex flex-col gap-3">
        <h2 id="ret-quiet" className="text-lg font-semibold text-primary">{t("retention.quiet")}</h2>
        <ul className="flex flex-col gap-3">
          {DEMO_QUIET.map((c) => (
            <li key={c.company} className="flex items-center justify-between gap-2 rounded-xl bg-primary p-4 ring-1 ring-secondary">
              <span className="text-sm font-semibold text-primary">{c.company}</span>
              {c.quietDays >= 10
                ? <Badge size="sm" color="warning">{t("retention.atRisk", "en", { n: c.quietDays })}</Badge>
                : <Badge size="sm" color="success">{t("retention.active", "en", { n: c.quietDays })}</Badge>}
            </li>
          ))}
        </ul>
        <p className="text-sm text-tertiary">{t("retention.fee", "en", { fee: FEE, n: DEMO_QUIET.length, total: FEE * DEMO_QUIET.length })}</p>
      </section>
    </main>
  );
}
