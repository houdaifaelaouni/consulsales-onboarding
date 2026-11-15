import { redirect } from "next/navigation";
import { Clock } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { DbAccess } from "@/components/access/db-access";
import { rowsToStates } from "@/lib/access/rows";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClientAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("membership").select("workspace_id").eq("user_id", user.id).limit(1);
  const workspaceId = data?.[0]?.workspace_id as string | undefined;
  if (!workspaceId) {
    return (
      <main className="mx-auto flex max-w-7xl px-4 py-16 lg:px-8">
        <EmptyState className="mx-auto">
          <EmptyState.Header><EmptyState.FeaturedIcon icon={Clock} color="gray" /></EmptyState.Header>
          <EmptyState.Content>
            <EmptyState.Title>{t("dash.empty.title")}</EmptyState.Title>
            <EmptyState.Description>{t("dash.empty.body")}</EmptyState.Description>
          </EmptyState.Content>
        </EmptyState>
      </main>
    );
  }
  const { data: rows } = await supabase.from("access_item").select("item_id,status,blocked_since,detail").eq("workspace_id", workspaceId);
  return <DbAccess workspaceId={workspaceId} initial={rowsToStates(rows ?? [])} />;
}
