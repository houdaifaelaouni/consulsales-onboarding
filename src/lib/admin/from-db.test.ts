import { describe, expect, it } from "vitest";
import { toAdminClients } from "./from-db";

const ws = [{ id: "w1", company: "Acme", plan: "pro", stage: "building", start_date: "2026-11-01" }];

describe("toAdminClients", () => {
  it("maps workspace, tasks, owner and newest-first events", () => {
    const [c] = toAdminClients(
      ws,
      [{ id: "t1", workspace_id: "w1", type: "complete_intake", status: "blocked", due_at: null }, { id: "t2", workspace_id: "other", type: "x", status: "todo", due_at: null }],
      [{ workspace_id: "w1", user_id: "u1", role: "delivery_lead" }, { workspace_id: "w1", user_id: "u2", role: "client_owner" }],
      [{ workspace_id: "w1", actor: null, action: "a", at: "2026-11-02T00:00:00Z" }, { workspace_id: "w1", actor: "u2", action: "b", at: "2026-11-03T00:00:00Z" }],
      [{ id: "u1", name: "Mia", email: "m@x.dev" }, { id: "u2", name: null, email: "sara@x.dev" }],
    );
    expect(c.owner).toBe("Mia");
    expect(c.tasks).toHaveLength(1);
    expect(c.tasks[0].status).toBe("blocked");
    expect(c.events.map((e) => [e.action, e.actor])).toEqual([["b", "sara"], ["a", "System"]]);
    expect(c.invoices).toEqual([]);
  });
  it("falls back on unknown values and no lead", () => {
    const [c] = toAdminClients([{ ...ws[0], plan: "??", stage: "??" }], [], [], [], []);
    expect([c.plan, c.stage, c.owner]).toEqual(["starter", "intake", "Unassigned"]);
  });
});

describe("toAdminClients invoices", () => {
  it("maps invoices and the oldest unpaid date", () => {
    const [c] = toAdminClients(ws, [], [], [], [], [
      { workspace_id: "w1", stage: 1, amount_cents: 50000, created_at: "2026-11-01T00:00:00Z", paid_at: "2026-11-01T00:00:00Z" },
      { workspace_id: "w1", stage: 2, amount_cents: null, created_at: "2020-01-01T00:00:00Z", paid_at: null },
      { workspace_id: "other", stage: 2, amount_cents: 1, created_at: "2019-01-01T00:00:00Z", paid_at: null },
    ]);
    expect(c.invoices.map((i) => [i.stage, i.status])).toEqual([[1, "paid"], [2, "overdue"]]);
    expect(c.invoiceUnpaidSince).toBe("2020-01-01T00:00:00Z");
  });
});
