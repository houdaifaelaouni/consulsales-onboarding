import { describe, expect, it } from "vitest";
import { createAgency, validateNewAgency, type AgencyAdminRepo } from "./admin";

function fakeRepo(over: Partial<AgencyAdminRepo> = {}) {
  const calls: string[] = [];
  const repo: AgencyAdminRepo = {
    upsertUserByEmail: async (e) => { calls.push(`user:${e}`); return "u1"; },
    createAgency: async (n) => { calls.push(`agency:${n}`); return "a1"; },
    addOwner: async (a, u) => { calls.push(`owner:${a}:${u}`); },
    sendInvite: async (e) => { calls.push(`invite:${e}`); },
    list: async () => [],
    ...over,
  };
  return { repo, calls };
}

describe("validateNewAgency", () => {
  it("cleans the name and lowercases the email", () => {
    expect(validateNewAgency({ name: "  North   Studio ", ownerEmail: " Sara@North.CO " })).toEqual({ ok: true, name: "North Studio", email: "sara@north.co" });
  });
  it("rejects a short or long name and a bad email", () => {
    expect(validateNewAgency({ name: "A", ownerEmail: "a@b.co" })).toEqual({ ok: false, reason: "name" });
    expect(validateNewAgency({ name: "x".repeat(81), ownerEmail: "a@b.co" })).toEqual({ ok: false, reason: "name" });
    for (const email of ["", "nope", "a@b", "a b@c.co"]) expect(validateNewAgency({ name: "Agency", ownerEmail: email })).toEqual({ ok: false, reason: "email" });
  });
});

describe("createAgency", () => {
  it("creates the user, the agency, the owner link, then sends the invite last", async () => {
    const { repo, calls } = fakeRepo();
    expect(await createAgency(repo, { name: "North", ownerEmail: "sara@north.co" })).toEqual({ ok: true, agencyId: "a1" });
    expect(calls).toEqual(["user:sara@north.co", "agency:North", "owner:a1:u1", "invite:sara@north.co"]);
  });
  it("sends no invite when an earlier step fails", async () => {
    const { repo, calls } = fakeRepo({ addOwner: async () => { throw new Error("db"); } });
    expect(await createAgency(repo, { name: "North", ownerEmail: "sara@north.co" })).toEqual({ ok: false, reason: "failed" });
    expect(calls.some((c) => c.startsWith("invite"))).toBe(false);
  });
  it("touches nothing when the input is invalid", async () => {
    const { repo, calls } = fakeRepo();
    expect(await createAgency(repo, { name: "", ownerEmail: "x" })).toEqual({ ok: false, reason: "name" });
    expect(calls).toEqual([]);
  });
});
