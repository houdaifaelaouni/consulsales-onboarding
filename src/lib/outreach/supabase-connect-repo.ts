import { createAdminClient } from "@/lib/supabase/admin";
import type { ConnectRepo } from "./connect";

/** Server-only (service role). Accounts and attempts are written only here, never by the browser. */
export function createSupabaseConnectRepo(): ConnectRepo {
  const db = createAdminClient();
  return {
    async hasConsent(workspaceId, version) {
      const { data, error } = await db.from("outreach_consent").select("id").eq("workspace_id", workspaceId).eq("notice_version", version).limit(1);
      if (error) throw error;
      return (data ?? []).length > 0;
    },
    async saveAttempt(a) {
      const { error } = await db.from("outreach_connect_attempt").insert({ token_hash: a.tokenHash, workspace_id: a.workspaceId, created_by: a.createdBy, expires_at: a.expiresAt.toISOString() });
      if (error) throw error;
    },
    async takeAttempt(tokenHash, now) {
      const { data, error } = await db.from("outreach_connect_attempt").update({ used_at: now.toISOString() })
        .eq("token_hash", tokenHash).is("used_at", null).gt("expires_at", now.toISOString()).select("workspace_id");
      if (error) throw error;
      const row = data?.[0];
      return row ? { workspaceId: row.workspace_id as string } : null;
    },
    async upsertAccount(a) {
      const { error } = await db.from("outreach_account").upsert(
        { workspace_id: a.workspaceId, unipile_account_id: a.unipileAccountId, status: "ok", status_at: new Date().toISOString() },
        { onConflict: "unipile_account_id" },
      );
      if (error) throw error;
    },
    async setStatus(unipileAccountId, status) {
      const { error } = await db.from("outreach_account").update({ status, status_at: new Date().toISOString() }).eq("unipile_account_id", unipileAccountId);
      if (error) throw error;
    },
  };
}
