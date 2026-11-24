"use client";

import { useRouter } from "next/navigation";
import { RefreshCw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { t } from "@/lib/i18n";
import type { QueueView } from "@/lib/outreach/analytics";
import { cx } from "@/utils/cx";

const BUCKETS = [
  { key: "pending", label: "outreach.q.pending", tone: "text-brand-secondary" },
  { key: "inProgress", label: "outreach.q.inProgress", tone: "text-brand-secondary" },
  { key: "completed", label: "outreach.q.completed", tone: "text-success-primary" },
  { key: "failed", label: "outreach.q.failed", tone: "text-error-primary" },
] as const;

/** Queue Status card: the four buckets of the processing chain and how far the campaign has got. */
export function QueueStatus({ queue, live }: { queue: QueueView; live: boolean }) {
  const router = useRouter();
  return (
    <section aria-labelledby="queue-status" className="flex flex-col gap-5 rounded-2xl border border-secondary bg-primary p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="queue-status" className="text-lg font-semibold text-primary">{t("outreach.q.title")}</h2>
          <p className="text-sm text-tertiary">{t("outreach.q.subtitle")}</p>
        </div>
        {live && (
          <Button size="sm" color="secondary" iconLeading={RefreshCw01} onPress={() => router.refresh()}>
            {t("outreach.q.refresh")}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-secondary">{t("outreach.q.overall")}</span>
          <span className="font-semibold text-primary">{queue.overall}%</span>
        </div>
        <ProgressBarBase value={queue.overall} max={100} aria-label={t("outreach.q.overall")} />
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {BUCKETS.map((bucket) => (
          <div key={bucket.key} className="flex flex-col gap-1 rounded-xl border border-secondary bg-secondary p-4">
            <dt className={cx("text-xs font-medium", bucket.tone)}>{t(bucket.label)}</dt>
            <dd className={cx("text-xl font-semibold", bucket.tone)}>{new Intl.NumberFormat("en-US").format(queue[bucket.key])}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-secondary">{t("outreach.q.perStep")}</h3>
        {queue.steps.length === 0 ? (
          <p className="text-sm text-tertiary">{t("outreach.q.empty")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {queue.steps.map((step) => (
              <li key={step.step} className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary ring-1 ring-secondary">
                {t("outreach.q.step", "en", { step: step.step + 1, leads: new Intl.NumberFormat("en-US").format(step.leads) })}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
