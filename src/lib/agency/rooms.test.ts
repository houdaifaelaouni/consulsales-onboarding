import { describe, expect, it } from "vitest";
import { openRoom, validateNewRoom, type RoomRepo } from "./rooms";

function fakeRepo(over: Partial<RoomRepo> = {}) {
  const calls: string[] = [];
  const repo: RoomRepo = {
    upsertUserByEmail: async (e) => { calls.push(`user:${e}`); return "client1"; },
    createRoom: async (r) => { calls.push(`room:${r.company}:${r.agencyId}:${r.ownerId}`); return { ok: true, workspaceId: "w1" }; },
    addMember: async (w, u, role) => { calls.push(`member:${w}:${u}:${role}`); },
    addTasks: async (w, u, tasks) => { calls.push(`tasks:${w}:${u}:${tasks.length}`); },
    sendInvite: async (e) => { calls.push(`invite:${e}`); },
    ...over,
  };
  return { repo, calls };
}
const input = { agencyId: "a1", openerId: "opener1", company: " Acme  Co ", clientEmail: "Boss@Acme.co" };

describe("validateNewRoom", () => {
  it("cleans the company and lowercases the email", () => {
    expect(validateNewRoom({ company: " Acme  Co ", clientEmail: " Boss@Acme.CO " })).toEqual({ ok: true, company: "Acme Co", email: "boss@acme.co" });
  });
  it("rejects a bad company and a bad email", () => {
    expect(validateNewRoom({ company: "A", clientEmail: "a@b.co" })).toEqual({ ok: false, reason: "company" });
    expect(validateNewRoom({ company: "Acme", clientEmail: "nope" })).toEqual({ ok: false, reason: "email" });
  });
});

describe("openRoom", () => {
  it("makes the client owner and the opener delivery lead, adds tasks, and invites last", async () => {
    const { repo, calls } = fakeRepo();
    expect(await openRoom(repo, input)).toEqual({ ok: true, workspaceId: "w1" });
    expect(calls).toEqual([
      "user:boss@acme.co", "room:Acme Co:a1:client1",
      "member:w1:client1:client_owner", "member:w1:opener1:delivery_lead", "tasks:w1:client1:7", "invite:boss@acme.co",
    ]);
  });
  it("stops with limit when the tier has no rooms left, adding and inviting nobody", async () => {
    const { repo, calls } = fakeRepo({ createRoom: async () => ({ ok: false, reason: "limit" }) });
    expect(await openRoom(repo, input)).toEqual({ ok: false, reason: "limit" });
    expect(calls.some((c) => c.startsWith("member") || c.startsWith("invite") || c.startsWith("tasks"))).toBe(false);
  });
  it("sends no invite when a later step fails", async () => {
    const { repo, calls } = fakeRepo({ addTasks: async () => { throw new Error("db"); } });
    expect(await openRoom(repo, input)).toEqual({ ok: false, reason: "failed" });
    expect(calls.some((c) => c.startsWith("invite"))).toBe(false);
  });
  it("touches nothing when the input is invalid", async () => {
    const { repo, calls } = fakeRepo();
    expect(await openRoom(repo, { ...input, company: "" })).toEqual({ ok: false, reason: "company" });
    expect(calls).toEqual([]);
  });
});
