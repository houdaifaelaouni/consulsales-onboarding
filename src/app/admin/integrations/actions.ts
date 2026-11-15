"use server";

import { getViewer } from "@/lib/auth/viewer";
import { ALL_VARS } from "@/lib/integrations/config";
import { makeSecret } from "@/lib/integrations/secret";
import { cleanSecret, isSavable, redeploy, saveEnv } from "@/lib/integrations/vercel";

export type ActionResult = { ok: true } | { ok: false; reason: "forbidden" | "invalid" | "not_configured" | "rejected" | "network" };

/** Saves one key to Vercel. Admin only, checked here again because a server action is a public endpoint. */
export async function saveKey(name: string, raw: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { ok: false, reason: "forbidden" };
  const value = cleanSecret(raw);
  if (!isSavable(name) || !value) return { ok: false, reason: "invalid" };
  // Neither the value nor Vercel's reply is logged or returned.
  return saveEnv(process.env, name, value);
}

/** Starts a production deployment so saved keys take effect. Admin only. */
export async function deployNow(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { ok: false, reason: "forbidden" };
  return redeploy(process.env);
}

/** Makes a strong random value for a key that only needs to exist (the scheduled-jobs secret) and saves it. The value is never shown. */
export async function generateKey(name: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return { ok: false, reason: "forbidden" };
  if (!ALL_VARS.some((v) => v.name === name && v.generate) || !isSavable(name)) return { ok: false, reason: "invalid" };
  return saveEnv(process.env, name, makeSecret());
}
