import { ALL_VARS, isSet } from "./config";

/** Only keys the app declares may be saved, and never the two that make saving possible. */
export function isSavable(name: string): boolean {
  const v = ALL_VARS.find((x) => x.name === name);
  return !!v && !v.bootstrap;
}

/** A pasted key: one line, printable, a sane length. Returns the cleaned value or null. */
export function cleanSecret(raw: string): string | null {
  const v = raw.trim();
  if (v.length === 0 || v.length > 4000) return null;
  if (/[\u0000-\u001f\u007f]/.test(v)) return null;
  return v;
}

export interface VercelConfig { token: string; teamId: string; projectId: string }

/** Reads the connection to Vercel from the server's own settings. Returns null until it is set up. */
export function vercelConfig(env: Record<string, string | undefined>): VercelConfig | null {
  const token = env.VERCEL_API_TOKEN, teamId = env.VERCEL_TEAM_ID;
  // VERCEL_PROJECT_ID is set by Vercel itself on every deployment.
  const projectId = env.VERCEL_PROJECT_ID;
  if (!isSet(token) || !isSet(teamId) || !isSet(projectId)) return null;
  return { token: token as string, teamId: teamId as string, projectId: projectId as string };
}

/** Builds the request that sets one variable. Secrets use the write-only "sensitive" type; public ones must stay readable. */
export function envRequest(cfg: VercelConfig, name: string, value: string): { url: string; init: RequestInit } {
  const isPublic = name.startsWith("NEXT_PUBLIC_");
  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(cfg.projectId)}/env?upsert=true&teamId=${encodeURIComponent(cfg.teamId)}`;
  return {
    url,
    init: {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ key: name, value, type: isPublic ? "plain" : "sensitive", target: ["production", "preview"] }),
    },
  };
}

export type SaveResult = { ok: true } | { ok: false; reason: "not_configured" | "rejected" | "network" };

/** Saves one variable. The response is never returned or logged, so a value can never leak through an error. */
export async function saveEnv(
  env: Record<string, string | undefined>, name: string, value: string, fetchImpl: typeof fetch = fetch,
): Promise<SaveResult> {
  const cfg = vercelConfig(env);
  if (!cfg) return { ok: false, reason: "not_configured" };
  const { url, init } = envRequest(cfg, name, value);
  try {
    const res = await fetchImpl(url, init);
    return res.ok ? { ok: true } : { ok: false, reason: "rejected" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Starts a new production deployment from the current one so saved variables take effect. */
export async function redeploy(env: Record<string, string | undefined>, fetchImpl: typeof fetch = fetch): Promise<SaveResult> {
  const cfg = vercelConfig(env);
  const deploymentId = env.VERCEL_DEPLOYMENT_ID;
  if (!cfg || !isSet(deploymentId)) return { ok: false, reason: "not_configured" };
  const name = env.VERCEL_PROJECT_NAME && isSet(env.VERCEL_PROJECT_NAME) ? env.VERCEL_PROJECT_NAME : "consulsalesonborading";
  try {
    const res = await fetchImpl(`https://api.vercel.com/v13/deployments?forceNew=1&teamId=${encodeURIComponent(cfg.teamId)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, deploymentId, target: "production" }),
    });
    return res.ok ? { ok: true } : { ok: false, reason: "rejected" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
