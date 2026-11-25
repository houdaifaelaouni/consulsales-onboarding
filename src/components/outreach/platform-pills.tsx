import Link from "next/link";
import { Check } from "@untitledui/icons";
import { t } from "@/lib/i18n";
import { CHANNELS, type Channel } from "@/lib/outreach/workspace";
import { cx } from "@/utils/cx";

const DOT: Record<Channel, string> = {
  linkedin: "bg-[#0a66c2]",
  instagram: "bg-[#e1306c]",
  facebook: "bg-[#1877f2]",
  x: "bg-primary",
  tiktok: "bg-primary",
  reddit: "bg-[#ff4500]",
  threads: "bg-primary",
  discord: "bg-[#5865f2]",
};

/** A small coloured dot stands in for the platform logo, so no third-party brand asset ships in this repo. */
export function PlatformDot({ channel, className }: { channel: Channel; className?: string }) {
  return <span aria-hidden className={cx("size-2.5 shrink-0 rounded-[3px]", DOT[channel], className)} />;
}

export function PlatformChip({ channel }: { channel: Channel }) {
  const info = CHANNELS.find((c) => c.key === channel) ?? CHANNELS[0];
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-secondary bg-primary px-3 py-1.5 text-sm font-medium text-secondary">
      <PlatformDot channel={channel} />
      {t(info.label)}
    </span>
  );
}

/** "All platforms" then one pill per channel. Only LinkedIn has data; the rest are shown but cannot be picked. */
export function PlatformFilter({ current, href, counts }: { current: Channel | "all"; href: (c: Channel | "all") => string; counts?: Partial<Record<Channel | "all", number>> }) {
  return (
    <nav aria-label={t("outreach.cl.filters")} className="flex flex-wrap gap-1 rounded-xl border border-secondary bg-primary p-1">
      <Link href={href("all")} aria-current={current === "all" ? "page" : undefined}
        className={cx("inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm", current === "all" ? "bg-secondary font-semibold text-primary" : "text-secondary hover:bg-secondary")}>
        <span aria-hidden className="size-2.5 rounded-full bg-gradient-to-br from-brand-solid to-[#e1306c]" />
        {t("outreach.lt.all")}
        {counts?.all ? <span className="text-xs text-tertiary">{counts.all}</span> : null}
      </Link>
      {CHANNELS.map((c) => {
        const active = current === c.key;
        const count = counts?.[c.key];
        return (
          <Link key={c.key} href={href(c.key)} aria-current={active ? "page" : undefined} title={c.available ? t(c.label) : t("outreach.lt.notConnected")}
            className={cx("inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm", active ? "bg-secondary font-semibold text-primary" : "text-secondary hover:bg-secondary")}>
            <PlatformDot channel={c.key} />
            {t(c.label)}
            {count ? <span className="text-xs text-tertiary">{count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** The one channel a campaign sends on, with a tick when it is the selected card in the create dialog. */
export function ChannelOption({ channel, selected, disabled }: { channel: Channel; selected: boolean; disabled?: boolean }) {
  const info = CHANNELS.find((c) => c.key === channel) ?? CHANNELS[0];
  return (
    <div className={cx("relative flex h-full flex-col gap-2 rounded-xl border p-4 text-left", selected ? "border-brand bg-secondary" : "border-secondary bg-primary", disabled && "opacity-60")}>
      <span className="flex items-center gap-2 text-sm font-semibold text-primary">
        <PlatformDot channel={channel} className="size-3" />
        {t(info.label)}
      </span>
      <span className="text-xs leading-5 text-tertiary">{t(info.body)}</span>
      {selected && <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-brand-solid text-white"><Check aria-hidden className="size-3.5" /></span>}
    </div>
  );
}
