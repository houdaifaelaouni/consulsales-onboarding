import { describe, expect, it } from "vitest";
import { AGENT_LIMITS, EMPTY_AGENT, validateAgent, type AgentProfile } from "./agent";

describe("validateAgent", () => {
  it("accepts the empty profile and a filled one", () => {
    expect(validateAgent(EMPTY_AGENT).ok).toBe(true);
    expect(validateAgent({ ...EMPTY_AGENT, domain: "consulsales.app", icp: "B2B agencies", identity: "founder" }).ok).toBe(true);
  });
  it("names the field that is too long", () => {
    const r = validateAgent({ ...EMPTY_AGENT, positioning: "x".repeat(AGENT_LIMITS.positioning + 1) });
    expect(r).toEqual({ ok: false, field: "positioning" });
  });
  it("refuses an unknown identity or time zone", () => {
    expect(validateAgent({ ...EMPTY_AGENT, identity: "robot" as unknown as AgentProfile["identity"] }).ok).toBe(false);
    expect(validateAgent({ ...EMPTY_AGENT, timezone: "Mars/Olympus" }).ok).toBe(false);
  });
});
