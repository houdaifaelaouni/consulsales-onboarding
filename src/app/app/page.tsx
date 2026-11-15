import { redirect } from "next/navigation";
import { AlertCircle, Clock } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Button } from "@/components/base/buttons/button";
import { ClientDashboard } from "@/components/dashboard/client-dashboard";
import { firstName, type HomeTask, type TaskStatus } from "@/lib/home";
import { t, type Locale } from "@/lib/i18n";
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
      <Notice icon="alert" title={t("dash.error.title")} body={t("dash.error.body")}>
        <Button color="secondary" href="/app">{t("dash.error.retry")}</Button>
      </Notice>
    );
  }
  if (!data) redirect("/login");

  const { workspace, tasks } = data;
  const name = firstName(data.name, data.email);
  if (!workspace) return <Notice icon="clock" title={t("dash.empty.title")} body={t("dash.empty.body")} />;

  return (
    <ClientDashboard
      name={name} company={workspace.company} startDate={workspace.start_date} now={new Date()} tasks={tasks}
      links="app"
    />
  );
}

function Notice({ title, body, icon, children }: { title: string; body: string; icon: "alert" | "clock"; children?: React.ReactNode }) {
  return (
    <main className="mx-auto flex max-w-7xl px-4 py-16 lg:px-8">
      <EmptyState className="mx-auto">
        <EmptyState.Header>
          <EmptyState.FeaturedIcon icon={icon === "alert" ? AlertCircle : Clock} color={icon === "alert" ? "error" : "gray"} />
        </EmptyState.Header>
        <EmptyState.Content>
          <EmptyState.Title>{title}</EmptyState.Title>
          <EmptyState.Description>{body}</EmptyState.Description>
        </EmptyState.Content>
        {children && <EmptyState.Footer>{children}</EmptyState.Footer>}
      </EmptyState>
    </main>
  );
}
