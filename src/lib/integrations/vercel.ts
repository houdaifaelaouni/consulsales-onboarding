import { ALL_VARS, isSet } from "./config";

/** Only keys the app declares may be saved, and never the ones that make saving possible. */
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

const DEFAULT_PROJECT = "consulsalesonborading";

export interface VercelBase { token: string; projectId: string; /** Optional override; normally found automatically. */ teamId: string | null }

/** True once the one thing the founder adds by hand, the Vercel token, is present. */
export const hasVercelToken = (env: Record<string, string | undefined>): boolean => isSet(env.VERCEL_API_TOKEN);

/**
 * The connection to Vercel from the server's own settings. Only the token is needed: the project is named by Vercel itself
 * on every deployment (or falls back to this project's name), and the team is found by asking Vercel.
 */
export function vercelBase(env: Record<string, string | undefined>): VercelBase | null {
  if (!hasVercelToken(env)) return null;
  const projectId = [env.VERCEL_PROJECT_ID, env.VERCEL_PROJECT_NAME].find((v) => isSet(v)) ?? DEFAULT_PROJECT;
  return { token: env.VERCEL_API_TOKEN as string, projectId, teamId: isSet(env.VERCEL_TEAM_ID) ? (env.VERCEL_TEAM_ID as string) : null };
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const withTeam = (url: string, teamId: string | null) => (teamId ? `${url}${url.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(teamId)}` : url);

const teamCache = new Map<string, string | null>();
/** Test hook: forget what was found. */
export const resetTeamCache = () => teamCache.clear();

export type SaveResult = { ok: true } | { ok: false; reason: "not_configured" | "rejected" | "network" };

/** Finds which team (or personal account) owns the project, by trying the ones the token can see. Remembered per server. */
export async function resolveTeam(base: VercelBase, fetchImpl: typeof fetch = fetch): Promise<{ ok: true; teamId: string | null } | { ok: false }> {
  if (base.teamId) return { ok: true, teamId: base.teamId };
  const key = `${base.token.slice(-6)}:${base.projectId}`;
  if (teamCache.has(key)) return { ok: true, teamId: teamCache.get(key) ?? null };
  const owns = async (teamId: string | null) => {
    const res = await fetchImpl(withTeam(`https://api.vercel.com/v9/projects/${encodeURIComponent(base.projectId)}`, teamId), { headers: auth(base.token) });
    return res.ok;
  };
  try {
    if (await owns(null)) { teamCache.set(key, null); return { ok: true, teamId: null }; }
    const res = await fetchImpl("https://api.vercel.com/v2/teams?limit=50", { headers: auth(base.token) });
    if (!res.ok) return { ok: false };
    const body = (await res.json()) as { teams?: Array<{ id?: unknown }> };
    for (const t of body.teams ?? []) {
      if (typeof t.id === "string" && (await owns(t.id))) { teamCache.set(key, t.id); return { ok: true, teamId: t.id }; }
    }
  } catch { /* falls through */ }
  return { ok: false };
}

/** Builds the request that sets one variable. Secrets use the write-only "sensitive" type; public ones must stay readable. */
export function envRequest(base: VercelBase, teamId: string | null, name: string, value: string): { url: string; init: RequestInit } {
  const isPublic = name.startsWith("NEXT_PUBLIC_");
  return {
    url: withTeam(`https://api.vercel.com/v10/projects/${encodeURIComponent(base.projectId)}/env?upsert=true`, teamId),
    init: {
      method: "POST",
      headers: { ...auth(base.token), "Content-Type": "application/json" },
      body: JSON.stringify({ key: name, value, type: isPublic ? "plain" : "sensitive", target: ["production", "preview"] }),
    },
  };
}

/** Saves one variable. The response is never returned or logged, so a value can never leak through an error. */
export async function saveEnv(
  env: Record<string, string | undefined>, name: string, value: string, fetchImpl: typeof fetch = fetch,
): Promise<SaveResult> {
  const base = vercelBase(env);
  if (!base) return { ok: false, reason: "not_configured" };
  const team = await resolveTeam(base, fetchImpl);
  if (!team.ok) return { ok: false, reason: "rejected" };
  const { url, init } = envRequest(base, team.teamId, name, value);
  try {
    const res = await fetchImpl(url, init);
    return res.ok ? { ok: true } : { ok: false, reason: "rejected" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Starts a new production deployment from the current one so saved variables take effect. */
export async function redeploy(env: Record<string, string | undefined>, fetchImpl: typeof fetch = fetch): Promise<SaveResult> {
  const base = vercelBase(env);
  const deploymentId = env.VERCEL_DEPLOYMENT_ID;
  if (!base || !isSet(deploymentId)) return { ok: false, reason: "not_configured" };
  const team = await resolveTeam(base, fetchImpl);
  if (!team.ok) return { ok: false, reason: "rejected" };
  const name = env.VERCEL_PROJECT_NAME && isSet(env.VERCEL_PROJECT_NAME) ? env.VERCEL_PROJECT_NAME : DEFAULT_PROJECT;
  try {
    const res = await fetchImpl(withTeam("https://api.vercel.com/v13/deployments?forceNew=1", team.teamId), {
      method: "POST",
      headers: { ...auth(base.token), "Content-Type": "application/json" },
      body: JSON.stringify({ name, deploymentId, target: "production" }),
    });
    return res.ok ? { ok: true } : { ok: false, reason: "rejected" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
