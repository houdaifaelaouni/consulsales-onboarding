import Link from "next/link";
import { t } from "@/lib/i18n";
import { cx } from "@/utils/cx";

const TABS = [
  { key: "account", href: "/app/outreach", label: "outreach.tabs.account" },
  { key: "leads", href: "/app/outreach/leads", label: "outreach.tabs.leads" },
] as const;

export type OutreachTab = (typeof TABS)[number]["key"];

/** The sub-navigation of the Outreach area. */
export function OutreachTabs({ current }: { current: OutreachTab }) {
  return (
    <nav aria-label={t("outreach.title")} className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <Link key={tab.key} href={tab.href} aria-current={tab.key === current ? "page" : undefined}
          className={cx("rounded-lg px-3 py-1.5 text-sm font-semibold ring-1", tab.key === current ? "bg-brand-solid text-white ring-transparent" : "bg-primary text-secondary ring-secondary hover:bg-secondary")}>
          {t(tab.label)}
        </Link>
      ))}
    </nav>
  );
}
