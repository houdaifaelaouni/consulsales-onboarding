import { createAdminClient } from "@/lib/supabase/admin";
import type { SendRepo, SendWork } from "./send";
import type { DueSend } from "./sender";
import { DEFAULT_SETTINGS, shortTime } from "./settings";

type Row = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : null);
const n = (v: unknown, fallback = 0) => (typeof v === "number" ? v : Number(v ?? fallback));

/** Server-only (service role). The sending tables are readable by members, writable only by the checked functions. */
export function createSupabaseSendRepo(): SendRepo {
  const db = createAdminClient();
  return {
    async workspaces() {
      const { data, error } = await db.rpc("outreach_run_workspaces");
      if (error) throw error;
      return ((data ?? []) as Row[]).flatMap((r): SendWork[] => {
        const workspaceId = s(r.workspace_id);
        const accountId = s(r.account_id);
        if (!workspaceId || !accountId) return [];
        return [{
          workspaceId,
          accountId,
          settings: {
            invitesPerDay: n(r.invites_per_day, DEFAULT_SETTINGS.invitesPerDay),
            messagesPerDay: n(r.messages_per_day, DEFAULT_SETTINGS.messagesPerDay),
            workStart: shortTime(s(r.work_start) ?? DEFAULT_SETTINGS.workStart),
            workEnd: shortTime(s(r.work_end) ?? DEFAULT_SETTINGS.workEnd),
            timezone: s(r.timezone) ?? DEFAULT_SETTINGS.timezone,
            weekdaysOnly: r.weekdays_only !== false,
            warmup: r.warmup !== false,
          },
          paused: false,
          adminStopped: false,
          accountStatus: "ok",
          warmupStart: s(r.warmup_from),
        }];
      });
    },
    async due(workspaceId, limit) {
      const { data, error } = await db.rpc("outreach_due_sends", { p_ws: workspaceId, p_limit: limit });
      if (error) throw error;
      return ((data ?? []) as Row[]).flatMap((r): DueSend[] => {
        const enrollmentId = s(r.enrollment_id);
        const leadId = s(r.lead_id);
        const campaignId = s(r.campaign_id);
        const kind = r.kind === "invite" ? "invite" : r.kind === "message" ? "message" : null;
        if (!enrollmentId || !leadId || !campaignId || !kind) return [];
        return [{
          enrollmentId, leadId, campaignId, kind,
          body: s(r.body) ?? "",
          position: n(r.position),
          leadName: s(r.lead_name) ?? "",
          leadTitle: s(r.lead_title),
          leadCompany: s(r.lead_company),
          linkedinKey: s(r.linkedin_key) ?? "",
          providerId: s(r.provider_id),
          chatId: s(r.chat_id),
          acceptedAt: s(r.accepted_at),
          dueAt: s(r.due_at) ?? new Date(0).toISOString(),
        }];
      });
    },
    async sentToday(workspaceId) {
      const { data, error } = await db.rpc("outreach_send_counts", { p_ws: workspaceId });
      if (error) throw error;
      const r = (data ?? {}) as Row;
      return { invites: n(r.invites), messages: n(r.messages) };
    },
    async saveProviderId(workspaceId, leadId, providerId) {
      const { error } = await db.rpc("outreach_lead_set_provider", { p_ws: workspaceId, p_lead: leadId, p_provider: providerId });
      if (error) throw error;
    },
    async sent(a) {
      const { error } = await db.rpc("outreach_record_send", { p_ws: a.workspaceId, p_enrollment: a.enrollmentId, p_kind: a.kind, p_position: a.position, p_chat_id: a.chatId });
      if (error) throw error;
    },
    async failed(a) {
      const { error } = await db.rpc("outreach_record_failure", { p_ws: a.workspaceId, p_enrollment: a.enrollmentId, p_error: a.error });
      if (error) throw error;
    },
  };
}
