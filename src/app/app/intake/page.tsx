import { redirect } from "next/navigation";
import { DbIntake } from "@/components/intake/db-intake";
import { Notice } from "@/components/shell/notice";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClientIntake() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("membership").select("workspace_id").eq("user_id", user.id).limit(1);
  const workspaceId = data?.[0]?.workspace_id as string | undefined;

  if (!workspaceId) {
    return <Notice icon="waiting" title={t("dash.empty.title")} body={t("dash.empty.body")} />;
  }
  return <main className="mx-auto max-w-2xl px-4 py-8 lg:px-8"><DbIntake workspaceId={workspaceId} /></main>;
}
