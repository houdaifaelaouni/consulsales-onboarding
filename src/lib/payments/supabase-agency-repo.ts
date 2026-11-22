import { isAgencyTier } from "@/lib/agency/tiers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgencyBilling, type AgencyBilling } from "./agency";

/** Server-only (service role). Agency tiers can only be changed here, by a verified payment. */
export function createSupabaseAgencyBilling(): AgencyBilling {
  const db = createAdminClient();
  return createAgencyBilling({
    async getTier(agencyId) {
      const { data, error } = await db.from("agency").select("tier").eq("id", agencyId).maybeSingle();
      if (error) throw error;
      return isAgencyTier(data?.tier) ? data.tier : null;
    },
    async setTier(agencyId, from, to) {
      const { data, error } = await db.from("agency").update({ tier: to }).eq("id", agencyId).eq("tier", from).select("id");
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  });
}
