import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanSecret, envRequest, hasVercelToken, isSavable, redeploy, resetTeamCache, resolveTeam, saveEnv, vercelBase } from "./vercel";
import { makeSecret } from "./secret";

const env = { VERCEL_API_TOKEN: "tok_123456", VERCEL_PROJECT_ID: "prj_xyz", VERCEL_DEPLOYMENT_ID: "dpl_1" };
const json = (body: unknown, ok = true) => ({ ok, json: async () => body });

beforeEach(() => resetTeamCache());

describe("integration keys on Vercel", () => {
  it("only declared keys are savable, never the ones that enable saving", () => {
    expect(isSavable("WHOP_API_KEY")).toBe(true);
    expect(isSavable("NEXT_PUBLIC_APP_URL")).toBe(true);
    expect(isSavable("CRON_SECRET")).toBe(true);
    expect(isSavable("VERCEL_API_TOKEN")).toBe(false);
    expect(isSavable("VERCEL_TEAM_ID")).toBe(false);
    expect(isSavable("SOME_OTHER_VAR")).toBe(false);
  });
  it("cleans a pasted key and rejects empty, multi-line or huge values", () => {
    expect(cleanSecret("  apik_abc  ")).toBe("apik_abc");
    expect(cleanSecret("   ")).toBeNull();
    expect(cleanSecret("a\nb")).toBeNull();
    expect(cleanSecret("x".repeat(4001))).toBeNull();
  });
  it("needs only the token: the project falls back and the team is optional", () => {
    expect(hasVercelToken(env)).toBe(true);
    expect(hasVercelToken({})).toBe(false);
    expect(vercelBase({ VERCEL_API_TOKEN: "tok_123456" })).toEqual({ token: "tok_123456", projectId: "consulsalesonborading", teamId: null });
    expect(vercelBase(env)).toEqual({ token: "tok_123456", projectId: "prj_xyz", teamId: null });
    expect(vercelBase({ ...env, VERCEL_TEAM_ID: "team_abc" })?.teamId).toBe("team_abc");
    expect(vercelBase({})).toBeNull();
  });
  it("finds the owning team by asking Vercel, and remembers it", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(json({}, false)) // not a personal project
      .mockResolvedValueOnce(json({ teams: [{ id: "team_other" }, { id: "team_mine" }] })) // team list
      .mockResolvedValueOnce(json({}, false)) // team_other does not own it
      .mockResolvedValueOnce(json({})); // team_mine does
    const base = vercelBase(env)!;
    expect(await resolveTeam(base, f as unknown as typeof fetch)).toEqual({ ok: true, teamId: "team_mine" });
    const calls = f.mock.calls.length;
    expect(await resolveTeam(base, f as unknown as typeof fetch)).toEqual({ ok: true, teamId: "team_mine" });
    expect(f.mock.calls.length).toBe(calls); // cached
  });
  it("works for a personal account (no team) and for an explicit team", async () => {
    const personal = vi.fn().mockResolvedValue(json({}));
    expect(await resolveTeam(vercelBase(env)!, personal as unknown as typeof fetch)).toEqual({ ok: true, teamId: null });
    const none = vi.fn();
    expect(await resolveTeam(vercelBase({ ...env, VERCEL_TEAM_ID: "team_abc" })!, none as unknown as typeof fetch)).toEqual({ ok: true, teamId: "team_abc" });
    expect(none).not.toHaveBeenCalled();
  });
  it("reports failure when no team owns the project", async () => {
    const f = vi.fn().mockResolvedValueOnce(json({}, false)).mockResolvedValueOnce(json({ teams: [{ id: "t1" }] })).mockResolvedValueOnce(json({}, false));
    expect(await resolveTeam(vercelBase(env)!, f as unknown as typeof fetch)).toEqual({ ok: false });
  });
  it("saves secrets as write-only and public values as plain, for production and preview", () => {
    const base = vercelBase(env)!;
    expect(JSON.parse(String(envRequest(base, "team_abc", "WHOP_API_KEY", "v").init.body))).toEqual({ key: "WHOP_API_KEY", value: "v", type: "sensitive", target: ["production", "preview"] });
    expect(JSON.parse(String(envRequest(base, null, "NEXT_PUBLIC_APP_URL", "https://x.y").init.body)).type).toBe("plain");
    expect(envRequest(base, "team_abc", "A", "v").url).toBe("https://api.vercel.com/v10/projects/prj_xyz/env?upsert=true&teamId=team_abc");
    expect(envRequest(base, null, "A", "v").url).toBe("https://api.vercel.com/v10/projects/prj_xyz/env?upsert=true");
  });
  it("reports success, rejection, network failure and missing setup without echoing the value", async () => {
    const withTeam = { ...env, VERCEL_TEAM_ID: "team_abc" };
    const ok = vi.fn().mockResolvedValue({ ok: true });
    expect(await saveEnv(withTeam, "WHOP_API_KEY", "SECRET-VALUE", ok as unknown as typeof fetch)).toEqual({ ok: true });
    const bad = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    expect(await saveEnv(withTeam, "WHOP_API_KEY", "SECRET-VALUE", bad as unknown as typeof fetch)).toEqual({ ok: false, reason: "rejected" });
    const down = vi.fn().mockRejectedValue(new Error("boom SECRET-VALUE"));
    const r = await saveEnv(withTeam, "WHOP_API_KEY", "SECRET-VALUE", down as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, reason: "network" });
    expect(JSON.stringify(r)).not.toContain("SECRET-VALUE");
    expect(await saveEnv({}, "WHOP_API_KEY", "v", ok as unknown as typeof fetch)).toEqual({ ok: false, reason: "not_configured" });
  });
  it("redeploys the current production deployment", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true });
    expect(await redeploy({ ...env, VERCEL_TEAM_ID: "team_abc" }, f as unknown as typeof fetch)).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toBe("https://api.vercel.com/v13/deployments?forceNew=1&teamId=team_abc");
    expect(JSON.parse(String(init.body))).toMatchObject({ deploymentId: "dpl_1", target: "production" });
    expect(await redeploy({ ...env, VERCEL_DEPLOYMENT_ID: undefined }, f as unknown as typeof fetch)).toEqual({ ok: false, reason: "not_configured" });
  });
  it("makes strong, different, URL-safe secrets", () => {
    const a = makeSecret(), b = makeSecret();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
