import { createAdminClient } from "@/lib/supabase/admin";
import type { Incoming, Relation } from "./replies";

/**
 * Server-only (service role). Both webhooks arrive with an Unipile account id; the workspace is looked up from
 * `outreach_account`, never from the payload, so a notification cannot touch another client's leads.
 */
export function createSupabaseReplyRepo() {
  const db = createAdminClient();
  async function workspaceOf(accountId: string): Promise<string | null> {
    const { data, error } = await db.from("outreach_account").select("workspace_id").eq("unipile_account_id", accountId).limit(1);
    if (error) throw error;
    return (data?.[0]?.workspace_id as string | undefined) ?? null;
  }
  return {
    /** An invitation was accepted: the first message becomes due after its delay. */
    async accepted(r: Relation): Promise<number> {
      const ws = await workspaceOf(r.accountId);
      if (!ws) return 0;
      const { data, error } = await db.rpc("outreach_enrollment_accepted", { p_ws: ws, p_provider: r.providerId, p_public_identifier: r.publicIdentifier });
      if (error) throw error;
      return Number(data ?? 0);
    },
    /** The lead wrote back: their sequence stops, and the chat is kept so a person can follow up. */
    async replied(m: Incoming): Promise<number> {
      const ws = await workspaceOf(m.accountId);
      if (!ws) return 0;
      const { data, error } = await db.rpc("outreach_enrollment_replied", {
        p_ws: ws, p_provider: m.contactProviderId, p_public_identifier: m.contactKey, p_chat_id: m.chatId,
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
  };
}
