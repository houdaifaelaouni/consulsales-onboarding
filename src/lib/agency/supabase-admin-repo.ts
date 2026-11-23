import { isAgencyTier } from "./tiers";
import type { AgencyAdminRepo } from "./admin";
import { createSupabaseProvisionRepo } from "@/lib/onboarding/supabase-repo";
import { createAdminClient } from "@/lib/supabase/admin";

/** Server-only (service role). Never import from client code. */
export function createSupabaseAgencyAdminRepo(): AgencyAdminRepo {
  const db = createAdminClient();
  const users = createSupabaseProvisionRepo();
  return {
    upsertUserByEmail: (email, locale) => users.upsertUserByEmail(email, locale),
    sendInvite: (email, locale) => users.sendInvite(email, locale),
    async createAgency(name) {
      const { data, error } = await db.from("agency").insert({ name }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    async addOwner(agencyId, userId) {
      const { error } = await db.from("agency_member").insert({ agency_id: agencyId, user_id: userId, role: "owner" });
      if (error) throw error;
    },
    async list() {
      const { data: agencies, error } = await db.from("agency").select("id,name,tier,created_at").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: owners, error: ownerErr } = await db.from("agency_member").select("agency_id,user_id").eq("role", "owner");
      if (ownerErr) throw ownerErr;
      const ids = [...new Set((owners ?? []).map((o) => o.user_id as string))];
      const { data: people } = ids.length ? await db.from("app_user").select("id,email").in("id", ids) : { data: [] };
      const email = new Map((people ?? []).map((p) => [p.id as string, p.email as string]));
      const ownerOf = new Map((owners ?? []).map((o) => [o.agency_id as string, email.get(o.user_id as string) ?? null]));
      return (agencies ?? []).map((a) => ({
        id: a.id as string, name: a.name as string, tier: isAgencyTier(a.tier) ? a.tier : "free", ownerEmail: ownerOf.get(a.id as string) ?? null, createdAt: a.created_at as string,
      }));
    },
  };
}
