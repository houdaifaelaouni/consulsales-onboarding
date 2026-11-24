"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type MessageKey } from "@/lib/i18n";
import { cx } from "@/utils/cx";

const TABS: Array<{ segment: string; label: MessageKey }> = [
  { segment: "", label: "outreach.ws.tab.campaign" },
  { segment: "leads", label: "outreach.ws.tab.leads" },
  { segment: "build", label: "outreach.ws.tab.build" },
  { segment: "accounts", label: "outreach.ws.tab.accounts" },
  { segment: "test", label: "outreach.ws.tab.test" },
];

/** `base` is /app/outreach/campaigns for the real screens and /demo/outreach/campaigns in the demo. */
export function CampaignTabs({ id, base }: { id: string; base: string }) {
  const path = usePathname();
  const root = `${base}/${id}`;
  return (
    <nav aria-label={t("outreach.ws.tabs")} className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-secondary p-1 ring-1 ring-secondary">
      {TABS.map((tab) => {
        const href = tab.segment ? `${root}/${tab.segment}` : root;
        const active = tab.segment ? path === href || path.startsWith(`${href}/`) : path === root;
        return (
          <Link key={tab.segment} href={href} aria-current={active ? "page" : undefined}
            className={cx(
              "flex shrink-0 items-center rounded-lg px-3 py-1.5 text-sm whitespace-nowrap",
              active ? "bg-primary font-semibold text-primary shadow-xs ring-1 ring-secondary" : "text-tertiary hover:text-primary",
            )}>
            {t(tab.label)}
          </Link>
        );
      })}
    </nav>
  );
}
