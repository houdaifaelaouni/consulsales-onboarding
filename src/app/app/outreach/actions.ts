"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/viewer";
import { NOTICE_VERSION, startConnect } from "@/lib/outreach/connect";
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
