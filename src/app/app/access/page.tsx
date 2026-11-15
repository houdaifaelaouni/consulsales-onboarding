import { redirect } from "next/navigation";
import { DbAccess } from "@/components/access/db-access";
import { rowsToStates } from "@/lib/access/rows";
import { Notice } from "@/components/shell/notice";
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
    return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;
  }
  const { data: rows } = await supabase.from("access_item").select("item_id,status,blocked_since,detail").eq("workspace_id", workspaceId);
  return <DbAccess workspaceId={workspaceId} initial={rowsToStates(rows ?? [])} />;
}
