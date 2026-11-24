import { CalendarCheck01, Check, CheckCircle, Container, Flag01, LayersTwo01, RefreshCw01, Star01, User01, XCircle } from "@untitledui/icons";
import { PlatformChip } from "@/components/outreach/platform-pills";
import { t } from "@/lib/i18n";
import { rates, type CampaignCounts } from "@/lib/outreach/analytics";
import type { Channel } from "@/lib/outreach/workspace";
import { cx } from "@/utils/cx";

const n = (value: number) => new Intl.NumberFormat("en-US").format(value);

/** The Campaign tab's metrics. Every number comes from the campaign's enrollments and send log. */
export function AnalyticsGrid({ counts, channel }: { counts: CampaignCounts; channel: Channel }) {
  const r = rates(counts);
  const tiles = [
    {
      key: "leads", icon: <User01 aria-hidden className="size-4" />, label: t("outreach.an.leads"),
      value: n(counts.leads), hint: t("outreach.an.leadsHint", "en", { n: n(counts.messages) }), tone: "text-primary",
    },
    {
      key: "invites", icon: <Flag01 aria-hidden className="size-4" />, label: t("outreach.an.invites"),
      value: n(counts.invites), hint: t("outreach.an.invitesHint", "en", { n: n(counts.accepted), rate: r.acceptance }), tone: "text-warning-primary",
    },
    {
      key: "messages", icon: <Container aria-hidden className="size-4" />, label: t("outreach.an.messages"),
      value: n(counts.messages), hint: t("outreach.an.messagesHint", "en", { n: n(counts.replies), rate: r.reply, adj: r.adjusted }), tone: "text-brand-secondary",
    },
    {
      key: "accepted", icon: <CheckCircle aria-hidden className="size-4" />, label: t("outreach.an.accepted"),
      value: n(counts.accepted), hint: t("outreach.an.acceptedHint", "en", { n: n(counts.accepted), of: n(counts.invites) }), tone: "text-success-primary",
    },
    {
      key: "replies", icon: <RefreshCw01 aria-hidden className="size-4" />, label: t("outreach.an.replies"),
      value: n(counts.replies), hint: t("outreach.an.repliesHint", "en", { rate: r.reply, adj: r.adjusted }), tone: "text-success-primary",
    },
    {
      key: "positive", icon: <Star01 aria-hidden className="size-4" />, label: t("outreach.an.positive"),
      value: n(counts.positive), hint: t("outreach.an.positiveHint", "en", { p: r.positiveOfReplies, m: r.positiveOfMessages }), tone: "text-brand-secondary",
    },
    {
      key: "conversations", icon: <LayersTwo01 aria-hidden className="size-4" />, label: t("outreach.an.conversations"),
      value: n(counts.conversations), hint: t("outreach.an.conversationsHint", "en", { n: r.conversationsOfReplies }), tone: "text-success-primary",
    },
    {
      key: "meetings", icon: <CalendarCheck01 aria-hidden className="size-4" />, label: t("outreach.an.meetings"),
      value: n(counts.meetings), hint: t("outreach.an.meetingsHint", "en", { p: r.meetingsOfPositive, m: r.meetingsOfMessages }), tone: "text-success-primary",
    },
    {
      key: "completed", icon: <Check aria-hidden className="size-4" />, label: t("outreach.an.completed"),
      value: n(counts.completed), hint: t("outreach.an.completedHint", "en", { n: n(counts.completed) }), tone: "text-primary",
    },
    {
      key: "stopped", icon: <XCircle aria-hidden className="size-4" />, label: t("outreach.an.stopped"),
      value: n(counts.stopped), hint: t("outreach.an.stoppedHint", "en", { n: n(counts.stopped) }), tone: "text-tertiary",
    },
  ];

  return (
    <section aria-labelledby="campaign-analytics" className="flex flex-col gap-4 rounded-2xl border border-secondary bg-primary p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="campaign-analytics" className="text-lg font-semibold text-primary">{t("outreach.an.title")}</h2>
          <p className="text-sm text-tertiary">{t("outreach.an.subtitle")}</p>
        </div>
        <PlatformChip channel={channel} />
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.key} className="flex flex-col gap-1 rounded-xl border border-secondary p-4">
            <dt className="flex items-center gap-2 text-sm font-medium text-tertiary">{tile.icon}{tile.label}</dt>
            <dd className={cx("text-display-xs font-semibold", tile.tone)}>{tile.value}</dd>
            <dd className="text-xs leading-5 text-tertiary">{tile.hint}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
