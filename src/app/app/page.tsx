import Link from "next/link";
import { redirect } from "next/navigation";
import { LayerStack } from "@/components/layer-stack";
import { Badge, buttonStyles, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  STAGES, completedStages, dayOfJourney, firstName, groupByStage, nextTask, progress, type HomeTask, type TaskStatus,
} from "@/lib/home";
import { t, tDynamic, type Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function loadHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Row-level security limits every query below to what this user may see.
  const [profileRes, membershipRes] = await Promise.all([
    supabase.from("app_user").select("name,email,locale").eq("id", user.id).maybeSingle(),
    supabase.from("membership").select("workspace_id").eq("user_id", user.id).limit(1),
  ]);
  if (profileRes.error || membershipRes.error) throw new Error("load failed");

  const profile = profileRes.data;
  const email = profile?.email ?? user.email ?? "";
  const locale = (profile?.locale ?? "en") as Locale;
  const workspaceId = membershipRes.data?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) return { email, name: profile?.name ?? null, locale, workspace: null, tasks: [] as HomeTask[] };

  const [wsRes, taskRes] = await Promise.all([
    supabase.from("workspace").select("company,start_date").eq("id", workspaceId).single(),
    supabase.from("task").select("id,type,status,due_at").eq("workspace_id", workspaceId),
  ]);
  if (wsRes.error || taskRes.error) throw new Error("load failed");

  const tasks: HomeTask[] = (taskRes.data ?? []).map((r) => ({
    id: r.id as string, type: r.type as string, status: r.status as TaskStatus, dueAt: (r.due_at as string | null) ?? null,
  }));
  return { email, name: profile?.name ?? null, locale, workspace: wsRes.data as { company: string; start_date: string }, tasks };
}

export default async function ClientHome() {
  let data: Awaited<ReturnType<typeof loadHome>>;
  try {
    data = await loadHome();
  } catch {
    return (
      <Shell>
        <EmptyState
          title={t("home.error.title")} body={t("home.error.body")}
          action={<Link href="/app" className={buttonStyles("secondary")}>{t("home.error.retry")}</Link>}
        />
      </Shell>
    );
  }

  if (!data) redirect("/login");
  const { locale, workspace, tasks } = data;
  const name = firstName(data.name, data.email);

  if (!workspace) {
    return (
      <Shell locale={locale}>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px]">{t("home.welcome", locale, { name })}</h1>
        <EmptyState title={t("home.empty.title", locale)} body={t("home.empty.body", locale)} />
      </Shell>
    );
  }

  const next = nextTask(tasks);
  const groups = groupByStage(tasks);
  const { done, total } = progress(tasks);

  return (
    <Shell locale={locale}>
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">
            {t("home.day", locale, { day: Math.min(dayOfJourney(workspace.start_date), 30) })} · {workspace.company}
          </p>
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px]">{t("home.welcome", locale, { name })}</h1>
          <p className="text-ink-muted">{t("home.progress", locale, { done, total })}</p>
        </div>
        <LayerStack completed={completedStages(tasks)} locale={locale} />
      </header>

      <Card className="space-y-3">
        <p className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">{t("home.next", locale)}</p>
        {next ? (
          <>
            <h2 className="text-[22px] leading-snug font-medium tracking-[-0.4px]">{tDynamic(`task.${next.type}`, locale, next.type)}</h2>
            <Link href={`/app/tasks/${next.type}`} className={buttonStyles("primary", "w-full sm:w-auto")}>
              {t("home.cta", locale)}
            </Link>
          </>
        ) : (
          <p className="text-ink-muted">{t("home.allDone", locale)}</p>
        )}
      </Card>

      <section aria-labelledby="checklist" className="space-y-6">
        <h2 id="checklist" className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">{t("home.checklist", locale)}</h2>
        {STAGES.map((s) => (
          <div key={s} className="space-y-2">
            <h3 className="text-base font-medium">{t(`home.stage.${s}` as "home.stage.1", locale)}</h3>
            {groups[s].length === 0 ? (
              <p className="rounded-lg border border-dashed border-hairline-strong px-4 py-3 text-sm text-ink-subtle">{t("home.stage.empty", locale)}</p>
            ) : (
              <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
                {groups[s].map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/app/tasks/${task.type}`}
                      className={cn("flex min-h-12 items-center justify-between gap-3 bg-surface-1 px-4 py-3 hover:bg-surface-2", task.status === "done" && "text-ink-subtle")}
                    >
                      <span className={cn(task.status === "done" && "line-through")}>{tDynamic(`task.${task.type}`, locale, task.type)}</span>
                      <Badge tone={task.status === "done" ? "success" : "neutral"}>{t(`home.status.${task.status}` as "home.status.todo", locale)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode; locale?: Locale }) {
  return <main className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-8 sm:py-12">{children}</main>;
}
