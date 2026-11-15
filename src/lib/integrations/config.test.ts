import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_VARS, envStatus, INTEGRATIONS, integrationState, isSet, summarize, webhookUrl } from "./config";

describe("what counts as set", () => {
  it("accepts real values and rejects empty or template placeholders", () => {
    expect(isSet("https://x.supabase.co")).toBe(true);
    expect(isSet(undefined)).toBe(false);
    for (const v of ["", "   ", "your_api_key", "PASTE_KEY", "changeme", "xxxxxxxx", "TODO", "<token>"]) expect(isSet(v)).toBe(false);
  });
});

describe("envStatus", () => {
  it("returns only true/false for each known variable, never the value", () => {
    const status = envStatus({ WHOP_API_KEY: "apik_super_secret", RESEND_API_KEY: "your_key", UNRELATED: "x" });
    expect(status.WHOP_API_KEY).toBe(true);
    expect(status.RESEND_API_KEY).toBe(false);
    expect("UNRELATED" in status).toBe(false);
    expect(JSON.stringify(status)).not.toContain("apik_super_secret");
    expect(Object.values(status).every((v) => typeof v === "boolean")).toBe(true);
  });
});

describe("integration state", () => {
  const whop = INTEGRATIONS.find((i) => i.id === "whop")!;
  const hubspot = INTEGRATIONS.find((i) => i.id === "hubspot")!;
  it("is missing, partial or ready depending on the required variables", () => {
    expect(integrationState(whop, envStatus({})).state).toBe("missing");
    expect(integrationState(whop, envStatus({ WHOP_API_KEY: "k" })).state).toBe("partial");
    expect(integrationState(whop, envStatus({ WHOP_API_KEY: "k", WHOP_ACCOUNT_ID: "biz_1", WHOP_WEBHOOK_SECRET: "ws_1" })).state).toBe("ready");
  });
  it("lists exactly what is missing", () => {
    expect(integrationState(whop, envStatus({ WHOP_API_KEY: "k" })).missing).toEqual(["WHOP_ACCOUNT_ID", "WHOP_WEBHOOK_SECRET"]);
  });
  it("treats an all-optional integration as optional until something is set", () => {
    expect(integrationState(hubspot, envStatus({})).state).toBe("optional");
    expect(integrationState(hubspot, envStatus({ HUBSPOT_CLIENT_ID: "id" })).state).toBe("partial");
  });
});

describe("summary and webhook url", () => {
  it("counts ready integrations and missing required variables", () => {
    const s = summarize(envStatus({}));
    expect(s.total).toBe(INTEGRATIONS.length);
    expect(s.ready).toBe(0);
    expect(s.requiredMissing).toBe(ALL_VARS.filter((v) => v.required).length);
  });
  it("builds the webhook address, with a clear placeholder before the app URL is set", () => {
    expect(webhookUrl("https://app.consulsales.com/", "/api/webhooks/whop")).toBe("https://app.consulsales.com/api/webhooks/whop");
    expect(webhookUrl(undefined, "/api/webhooks/whop")).toBe("https://YOUR-DOMAIN/api/webhooks/whop");
  });
});

describe("config hygiene", () => {
  it("has unique variable names, and every one has a placeholder line in .env.example", () => {
    const names = ALL_VARS.map((v) => v.name);
    expect(new Set(names).size).toBe(names.length);
    const example = readFileSync(".env.example", "utf8");
    for (const n of names) expect(example).toMatch(new RegExp(`^${n}=`, "m"));
  });
  it("only public variables start with NEXT_PUBLIC_, so secrets can never reach the browser", () => {
    for (const v of ALL_VARS) expect(v.name.startsWith("NEXT_PUBLIC_")).toBe(v.kind === "public");
  });
});
