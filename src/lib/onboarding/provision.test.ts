import { describe, expect, it } from "vitest";
import { provisionWorkspace, type ProvisionRepo } from "./provision";
import type { NormalizedPayment } from "@/lib/payments/types";

function memoryRepo(failOn?: "createWorkspace") {
  const state = {
    payments: new Set<string>(), events: [] as string[], workspaces: [] as Array<{ plan: string; language: string; company: string }>,
    memberships: [] as string[], tasks: [] as string[], invites: [] as string[],
  };
  const repo: ProvisionRepo = {
    async workspaceExistsForPayment(_p, id) { return state.payments.has(id); },
    async recordEvent(id) { state.events.push(id); },
    async upsertUserByEmail() { return "user-1"; },
    async createWorkspace(w) {
      if (failOn === "createWorkspace") throw new Error("db down");
      state.payments.add(w.paymentId);
      state.workspaces.push({ plan: w.plan, language: w.language, company: w.company });
      return "ws-1";
    },
    async addMembership(_w, _u, role) { state.memberships.push(role); },
    async addTasks(_w, _u, t) { state.tasks.push(...t.map((x) => x.type)); },
    async sendInvite(email, locale, key) { state.invites.push(`${email}:${locale}:${key}`); },
  };
  return { repo, state };
}

const payment = (over: Partial<NormalizedPayment> = {}): NormalizedPayment => ({
  eventId: "msg_1", paymentId: "pay_1", email: "sara@agency.com", amount: "500.00", currency: "eur",
  metadata: { plan: "pro", company: "Studio North", language: "fr" }, ...over,
});

describe("provisionWorkspace", () => {
  it("creates workspace, owner membership, plan tasks and invite in the client's language", async () => {
    const { repo, state } = memoryRepo();
    const r = await provisionWorkspace(repo, "whop", payment());
    expect(r).toEqual({ status: "created", workspaceId: "ws-1" });
    expect(state.workspaces[0]).toMatchObject({ plan: "pro", language: "fr", company: "Studio North" });
    expect(state.memberships).toEqual(["client_owner"]);
    expect(state.tasks).toContain("approve_profile");
    expect(state.invites).toEqual(["sara@agency.com:fr:invite-whop-pay_1"]);
    expect(state.events).toEqual(["msg_1"]);
  });

  it("is idempotent: a redelivered webhook creates nothing twice", async () => {
    const { repo, state } = memoryRepo();
    await provisionWorkspace(repo, "whop", payment());
    const again = await provisionWorkspace(repo, "whop", payment({ eventId: "msg_2" }));
    expect(again).toEqual({ status: "duplicate" });
    expect(state.workspaces).toHaveLength(1);
    expect(state.invites).toHaveLength(1);
  });

  it("recovers on retry after a partial failure", async () => {
    const broken = memoryRepo("createWorkspace");
    await expect(provisionWorkspace(broken.repo, "whop", payment())).rejects.toThrow("db down");
    expect(broken.state.events).toHaveLength(0);
    const healthy = memoryRepo();
    expect((await provisionWorkspace(healthy.repo, "whop", payment())).status).toBe("created");
  });

  it("rejects a payment with no known plan and creates nothing", async () => {
    const { repo, state } = memoryRepo();
    const r = await provisionWorkspace(repo, "whop", payment({ metadata: { plan: "gold" } }));
    expect(r.status).toBe("rejected");
    expect(state.workspaces).toHaveLength(0);
  });

  it("falls back to English for an unsupported language", async () => {
    const { repo, state } = memoryRepo();
    await provisionWorkspace(repo, "whop", payment({ metadata: { plan: "starter", language: "xx" } }));
    expect(state.workspaces[0].language).toBe("en");
  });
});
