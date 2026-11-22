import type { RoomRepo } from "./rooms";
import { createSupabaseProvisionRepo } from "@/lib/onboarding/supabase-repo";
import { createAdminClient } from "@/lib/supabase/admin";

/** Server-only (service role). Never import from client code. The database trigger is what refuses a room over the tier limit. */
export function createSupabaseRoomRepo(): RoomRepo {
  const db = createAdminClient();
  const users = createSupabaseProvisionRepo();
  return {
    upsertUserByEmail: (email, locale) => users.upsertUserByEmail(email, locale),
    addTasks: (workspaceId, userId, tasks) => users.addTasks(workspaceId, userId, tasks),
    sendInvite: (email, locale) => users.sendInvite(email, locale),
    async createRoom(r) {
      const { data, error } = await db.from("workspace").insert({
        company: r.company, plan: "pro", language: "en", owner_id: r.ownerId, contact_email: r.contactEmail, agency_id: r.agencyId,
      }).select("id").single();
      if (error) {
        if (error.code === "23514") return { ok: false, reason: "limit" };
        throw error;
      }
      return { ok: true, workspaceId: data.id as string };
    },
    async addMember(workspaceId, userId, role) {
      const { error } = await db.from("membership").upsert({ workspace_id: workspaceId, user_id: userId, role }, { onConflict: "workspace_id,user_id" });
      if (error) throw error;
    },
  };
}
