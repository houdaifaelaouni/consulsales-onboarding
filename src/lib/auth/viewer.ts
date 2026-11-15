import { createClient } from "@/lib/supabase/server";
import type { Role } from "./access";

/** Reads the signed-in person and their roles. Row-level security limits every query to what they may see. */
export async function getViewer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [profile, memberships] = await Promise.all([
    supabase.from("app_user").select("name,is_admin").eq("id", user.id).maybeSingle(),
    supabase.from("membership").select("role").eq("user_id", user.id),
  ]);
  return {
    id: user.id,
    email: user.email ?? "",
    name: (profile.data?.name as string | null) ?? null,
    isAdmin: profile.data?.is_admin === true,
    roles: ((memberships.data ?? []).map((m) => m.role) as Role[]),
  };
}
