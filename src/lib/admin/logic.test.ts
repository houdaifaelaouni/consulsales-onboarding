import { describe, expect, it } from "vitest";
import { blockedCount, computeFlags, filterClients, groupByStage, sortForBoard, uniqueOwners } from "./logic";
import type { AdminClient } from "./types";

const now = new Date("2026-11-15T12:00:00Z");
const ago = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const client = (over: Partial<AdminClient> = {}): AdminClient => ({
  id: "c", company: "Acme", plan: "pro", owner: "Alex", stage: "intake", startDate: "2026-11-10",
  tasks: [], files: [], invoices: [], events: [], notes: [], ...over,
});

describe("computeFlags", () => {
  it("flags overdue open tasks but not done ones or future ones", () => {
    const c = client({ tasks: [
      { id: "1", type: "a", status: "todo", dueAt: ago(5) },
      { id: "2", type: "b", status: "done", dueAt: ago(50) },
      { id: "3", type: "c", status: "todo", dueAt: new Date(now.getTime() + 3_600_000).toISOString() },
      { id: "4", type: "d", status: "blocked", dueAt: ago(1) },
    ] });
    expect(computeFlags(c, now)).toEqual([{ kind: "task_overdue", amount: 2 }]);
  });
  it("flags access blocked at 72 hours, not before", () => {
    expect(computeFlags(client({ accessBlockedSince: ago(71) }), now)).toEqual([]);
    expect(computeFlags(client({ accessBlockedSince: ago(80) }), now)).toEqual([{ kind: "access_blocked", amount: 80 }]);
  });
  it("flags an invoice unpaid for 7 days", () => {
    expect(computeFlags(client({ invoiceUnpaidSince: ago(24 * 6) }), now)).toEqual([]);
    expect(computeFlags(client({ invoiceUnpaidSince: ago(24 * 9) }), now)).toEqual([{ kind: "invoice_unpaid", amount: 9 }]);
  });
  it("can raise several flags at once", () => {
    const c = client({ accessBlockedSince: ago(100), invoiceUnpaidSince: ago(24 * 8), tasks: [{ id: "1", type: "a", status: "todo", dueAt: ago(2) }] });
    expect(computeFlags(c, now).map((f) => f.kind)).toEqual(["task_overdue", "access_blocked", "invoice_unpaid"]);
  });
});

describe("board", () => {
  const clean = client({ id: "clean", company: "Clean", startDate: "2026-11-01" });
  const one = client({ id: "one", company: "One", accessBlockedSince: ago(100), startDate: "2026-11-12" });
  const two = client({ id: "two", company: "Two", accessBlockedSince: ago(100), invoiceUnpaidSince: ago(24 * 9), startDate: "2026-11-13" });
  it("puts blocked clients first, most flags first", () => {
    expect(sortForBoard([clean, one, two], now).map((c) => c.id)).toEqual(["two", "one", "clean"]);
  });
  it("groups by stage with sorting applied", () => {
    const g = groupByStage([clean, one, client({ id: "live1", stage: "live" })], now);
    expect(g.intake.map((c) => c.id)).toEqual(["one", "clean"]);
    expect(g.live).toHaveLength(1);
    expect(g.review).toEqual([]);
  });
  it("filters by plan and owner, and lists owners", () => {
    const list = [client({ id: "a", plan: "starter", owner: "Alex" }), client({ id: "b", plan: "pro", owner: "Mia" })];
    expect(filterClients(list, { plan: "pro", owner: "all" }).map((c) => c.id)).toEqual(["b"]);
    expect(filterClients(list, { plan: "all", owner: "Alex" }).map((c) => c.id)).toEqual(["a"]);
    expect(filterClients(list, { plan: "all", owner: "all" })).toHaveLength(2);
    expect(uniqueOwners(list)).toEqual(["Alex", "Mia"]);
  });
  it("counts blocked clients", () => {
    expect(blockedCount([clean, one, two], now)).toBe(2);
  });
});
