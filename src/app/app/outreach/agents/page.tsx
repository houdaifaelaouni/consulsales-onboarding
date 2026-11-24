import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentForm } from "@/components/outreach/agents/agent-form";
import { OutreachTabs } from "@/components/outreach/tabs";
import { Notice } from "@/components/shell/notice";
import { t, type MessageKey } from "@/lib/i18n";
import { EMPTY_AGENT, type AgentProfile } from "@/lib/outreach/agent";
import { createClient } from "@/lib/supabase/server";
import { cx } from "@/utils/cx";

export const dynamic = "force-dynamic";

const TABS: Array<{ key: string; label: MessageKey }> = [
  { key: "general", label: "outreach.ag.tab.general" },
  { key: "knowledge", label: "outreach.ag.tab.knowledge" },
  { key: "team", label: "outreach.ag.tab.team" },
  { key: "build", label: "outreach.ag.tab.build" },
  { key: "operator", label: "outreach.ag.tab.operator" },
];

export default async function AgentsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const current = TABS.some((x) => x.key === tab) ? (tab as string) : "general";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m } = await supabase.from("membership").select("workspace_id,role").eq("user_id", user.id).limit(1);
  const workspaceId = m?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;

  const { data, error } = await supabase
    .from("outreach_agent_profile")
    .select("domain,context,icp,identity,positioning,instructions,notes,timezone")
    .eq("workspace_id", workspaceId).maybeSingle();
  if (error) return <Notice icon="error" title={t("outreach.error.title")} body={t("outreach.error.body")} />;

  const profile: AgentProfile = data ? {
    domain: (data.domain as string | null) ?? "", context: (data.context as string | null) ?? "",
    icp: (data.icp as string | null) ?? "", identity: (data.identity as "ai" | "founder") ?? "ai",
    positioning: (data.positioning as string | null) ?? "", instructions: (data.instructions as string | null) ?? "",
    notes: (data.notes as string | null) ?? "", timezone: (data.timezone as string | null) ?? EMPTY_AGENT.timezone,
  } : EMPTY_AGENT;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-display-sm font-semibold text-primary">{t("outreach.ag.title")}</h1>
          <p className="text-md text-tertiary">{t("outreach.ag.subtitle")}</p>
        </div>
        <OutreachTabs current="agents" />
        <nav aria-label={t("outreach.ag.title")} className="flex gap-1 overflow-x-auto rounded-xl bg-secondary p-1 ring-1 ring-secondary">
          {TABS.map((item) => (
            <Link key={item.key} href={`/app/outreach/agents?tab=${item.key}`} aria-current={item.key === current ? "page" : undefined}
              className={cx("shrink-0 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap", item.key === current ? "bg-primary font-semibold text-primary shadow-xs" : "text-tertiary hover:text-primary")}>
              {t(item.label)}
            </Link>
          ))}
        </nav>
      </header>

      {current === "general" ? (
        <AgentForm initial={profile} live />
      ) : (
        <p className="rounded-2xl border border-secondary bg-primary p-8 text-center text-sm text-tertiary">{t("outreach.ag.soon")}</p>
      )}
    </main>
  );
}
