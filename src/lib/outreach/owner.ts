import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

/** The signed-in client owner, their workspace and a row-level-security client. Null for anyone else. Server only. */
export async function getOwnerContext() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("membership").select("workspace_id").eq("user_id", viewer.id).eq("role", "client_owner").limit(1);
  const workspaceId = data?.[0]?.workspace_id as string | undefined;
  return workspaceId ? { viewer, supabase, workspaceId } : null;
}
