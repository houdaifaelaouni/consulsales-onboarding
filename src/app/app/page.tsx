import { redirect } from "next/navigation";
import { SecureCard } from "@/components/auth/secure-card";
import { Notice } from "@/components/shell/notice";
import { ClientDashboard } from "@/components/dashboard/client-dashboard";
import { pinStatus } from "@/lib/auth/pin-status";
import { getViewer } from "@/lib/auth/viewer";
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
      <Notice icon="error" title={t("dash.error.title")} body={t("dash.error.body")} retryHref="/app" retryLabel={t("dash.error.retry")} />
    );
  }
  if (!data) redirect("/login");

  const { workspace, tasks } = data;
  const name = firstName(data.name, data.email);
  if (!workspace) return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;

  const viewer = await getViewer();
  const pin = viewer ? await pinStatus(viewer.id) : "unavailable";

  return (
    <>
      {viewer && <SecureCard userId={viewer.id} pin={pin} />}
      <ClientDashboard
        name={name} company={workspace.company} startDate={workspace.start_date} now={new Date()} tasks={tasks}
        links="app"
      />
    </>
  );
}

