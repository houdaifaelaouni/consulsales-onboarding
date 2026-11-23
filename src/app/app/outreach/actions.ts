"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/viewer";
import { NOTICE_VERSION, startConnect } from "@/lib/outreach/connect";
import { type OutreachSettings, validateSettings } from "@/lib/outreach/settings";
import { createSupabaseConnectRepo } from "@/lib/outreach/supabase-connect-repo";
import { createHostedLink, unipileBase } from "@/lib/outreach/unipile";
import { createClient } from "@/lib/supabase/server";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

async function ownerWorkspace() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("membership").select("workspace_id").eq("user_id", viewer.id).eq("role", "client_owner").limit(1);
  const workspaceId = data?.[0]?.workspace_id as string | undefined;
  return workspaceId ? { viewer, supabase, workspaceId } : null;
}

export type ConsentResult = { ok: true } | { ok: false; reason: "forbidden" | "failed" };

/** The owner accepts the risk notice. The row is append-only and row-level security lets an owner write only their own. */
export async function acceptRisk(): Promise<ConsentResult> {
  const ctx = await ownerWorkspace();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const { error } = await ctx.supabase.from("outreach_consent").insert({ workspace_id: ctx.workspaceId, user_id: ctx.viewer.id, notice_version: NOTICE_VERSION });
  if (error) return { ok: false, reason: "failed" };
  revalidatePath("/app/outreach");
  return { ok: true };
}

export type ConnectResult = { ok: true; url: string } | { ok: false; reason: "forbidden" | "consent_required" | "unavailable" | "failed" };

/** Starts the hosted LinkedIn login. Needs the owner's accepted notice and Unipile to be set up. */
export async function connectLinkedIn(): Promise<ConnectResult> {
  const ctx = await ownerWorkspace();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const secret = process.env.UNIPILE_WEBHOOK_SECRET;
  if (!unipileBase(process.env.UNIPILE_DSN) || !process.env.UNIPILE_API_KEY || !secret) return { ok: false, reason: "unavailable" };
  const base = appUrl();
  return startConnect(
    createSupabaseConnectRepo(),
    ({ name, expiresOn }) => createHostedLink({}, {
      name, expiresOn, successUrl: `${base}/app/outreach?connected=1`, failureUrl: `${base}/app/outreach?failed=1`,
      notifyUrl: `${base}/api/webhooks/unipile/connected?s=${encodeURIComponent(secret)}`,
    }),
    { workspaceId: ctx.workspaceId, userId: ctx.viewer.id },
  );
}

export type SaveSettingsResult = { ok: true } | { ok: false; reason: "forbidden" | "invitesPerDay" | "messagesPerDay" | "hours" | "timezone" | "failed" };

/** Saves the client's limits. They are checked here and again by the database, which is the one that cannot be skipped. */
export async function saveSettings(input: OutreachSettings): Promise<SaveSettingsResult> {
  const ctx = await ownerWorkspace();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const v = validateSettings(input);
  if (!v.ok) return { ok: false, reason: v.field };
  const s = v.value;
  const { error } = await ctx.supabase.rpc("outreach_settings_save", {
    p_ws: ctx.workspaceId, p_invites: s.invitesPerDay, p_messages: s.messagesPerDay, p_start: s.workStart, p_end: s.workEnd,
    p_tz: s.timezone, p_weekdays: s.weekdaysOnly, p_warmup: s.warmup,
  });
  if (error) return { ok: false, reason: /not allowed/i.test(error.message) ? "forbidden" : "failed" };
  revalidatePath("/app/outreach");
  return { ok: true };
}

export type PauseResult = { ok: true } | { ok: false; reason: "forbidden" | "notice" | "no_account" | "failed" };

/** Start or pause sending. Starting needs the accepted notice and a connected account; the database refuses otherwise. */
export async function setPaused(paused: boolean): Promise<PauseResult> {
  const ctx = await ownerWorkspace();
  if (!ctx) return { ok: false, reason: "forbidden" };
  const { error } = await ctx.supabase.rpc("outreach_set_paused", { p_ws: ctx.workspaceId, p_paused: paused });
  if (error) {
    if (/risk notice/i.test(error.message)) return { ok: false, reason: "notice" };
    if (/no connected account/i.test(error.message)) return { ok: false, reason: "no_account" };
    return { ok: false, reason: /not allowed/i.test(error.message) ? "forbidden" : "failed" };
  }
  revalidatePath("/app/outreach");
  return { ok: true };
}
