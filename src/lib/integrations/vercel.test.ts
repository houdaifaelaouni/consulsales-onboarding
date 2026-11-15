import { describe, expect, it, vi } from "vitest";
import { cleanSecret, envRequest, isSavable, redeploy, saveEnv, vercelConfig } from "./vercel";

const env = { VERCEL_API_TOKEN: "tok_123456", VERCEL_TEAM_ID: "team_abc", VERCEL_PROJECT_ID: "prj_xyz", VERCEL_DEPLOYMENT_ID: "dpl_1" };

describe("integration keys on Vercel", () => {
  it("only declared keys are savable, never the ones that enable saving", () => {
    expect(isSavable("WHOP_API_KEY")).toBe(true);
    expect(isSavable("NEXT_PUBLIC_APP_URL")).toBe(true);
    expect(isSavable("VERCEL_API_TOKEN")).toBe(false);
    expect(isSavable("VERCEL_TEAM_ID")).toBe(false);
    expect(isSavable("SOME_OTHER_VAR")).toBe(false);
    expect(isSavable("")).toBe(false);
  });
  it("cleans a pasted key and rejects empty, multi-line or huge values", () => {
    expect(cleanSecret("  apik_abc  ")).toBe("apik_abc");
    expect(cleanSecret("   ")).toBeNull();
    expect(cleanSecret("a\nb")).toBeNull();
    expect(cleanSecret("x".repeat(4001))).toBeNull();
  });
  it("needs the token, team and project before it can save", () => {
    expect(vercelConfig(env)).toEqual({ token: "tok_123456", teamId: "team_abc", projectId: "prj_xyz" });
    expect(vercelConfig({ ...env, VERCEL_API_TOKEN: "" })).toBeNull();
    expect(vercelConfig({ ...env, VERCEL_TEAM_ID: undefined })).toBeNull();
  });
  it("saves secrets as write-only and public values as plain, for production and preview", () => {
    const cfg = vercelConfig(env)!;
    const secret = JSON.parse(String(envRequest(cfg, "WHOP_API_KEY", "v").init.body));
    expect(secret).toEqual({ key: "WHOP_API_KEY", value: "v", type: "sensitive", target: ["production", "preview"] });
    expect(JSON.parse(String(envRequest(cfg, "NEXT_PUBLIC_APP_URL", "https://x.y").init.body)).type).toBe("plain");
    expect(envRequest(cfg, "A", "v").url).toContain("/projects/prj_xyz/env?upsert=true&teamId=team_abc");
  });
  it("reports success, rejection, network failure and missing setup without echoing the value", async () => {
    const ok = vi.fn().mockResolvedValue({ ok: true });
    expect(await saveEnv(env, "WHOP_API_KEY", "SECRET-VALUE", ok)).toEqual({ ok: true });
    const bad = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    expect(await saveEnv(env, "WHOP_API_KEY", "SECRET-VALUE", bad)).toEqual({ ok: false, reason: "rejected" });
    const down = vi.fn().mockRejectedValue(new Error("boom SECRET-VALUE"));
    const r = await saveEnv(env, "WHOP_API_KEY", "SECRET-VALUE", down);
    expect(r).toEqual({ ok: false, reason: "network" });
    expect(JSON.stringify(r)).not.toContain("SECRET-VALUE");
    expect(await saveEnv({}, "WHOP_API_KEY", "v", ok)).toEqual({ ok: false, reason: "not_configured" });
  });
  it("redeploys the current production deployment", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true });
    expect(await redeploy(env, f)).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain("/v13/deployments?forceNew=1&teamId=team_abc");
    expect(JSON.parse(String(init.body))).toMatchObject({ deploymentId: "dpl_1", target: "production" });
    expect(await redeploy({ ...env, VERCEL_DEPLOYMENT_ID: undefined }, f)).toEqual({ ok: false, reason: "not_configured" });
  });
});
