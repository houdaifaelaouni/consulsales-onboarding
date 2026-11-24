import { AgentForm } from "@/components/outreach/agents/agent-form";
import { t, type MessageKey } from "@/lib/i18n";
import { DEMO_AGENT } from "@/lib/outreach/sample";
import { cx } from "@/utils/cx";

export const metadata = { title: "AI Super Agents demo" };

const TABS: Array<{ key: string; label: MessageKey }> = [
  { key: "general", label: "outreach.ag.tab.general" },
  { key: "knowledge", label: "outreach.ag.tab.knowledge" },
  { key: "team", label: "outreach.ag.tab.team" },
  { key: "build", label: "outreach.ag.tab.build" },
  { key: "operator", label: "outreach.ag.tab.operator" },
];

export default function DemoAgents() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-display-sm font-semibold text-primary">{t("outreach.ag.title")}</h1>
          <p className="text-md text-tertiary">{t("outreach.ag.subtitle")}</p>
        </div>
        <nav aria-label={t("outreach.ag.title")} className="flex gap-1 overflow-x-auto rounded-xl bg-secondary p-1 ring-1 ring-secondary">
          {TABS.map((item) => (
            <span key={item.key} aria-current={item.key === "general" ? "page" : undefined}
              className={cx("shrink-0 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap", item.key === "general" ? "bg-primary font-semibold text-primary shadow-xs" : "text-tertiary")}>
              {t(item.label)}
            </span>
          ))}
        </nav>
      </header>
      <AgentForm initial={DEMO_AGENT} live={false} />
    </main>
  );
}
