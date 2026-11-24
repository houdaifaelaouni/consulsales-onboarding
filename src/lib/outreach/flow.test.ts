import { describe, expect, it } from "vitest";
import { buildFlow, edgePath, FLOW, nodeCentre } from "./flow";

const steps = [
  { delayDays: 0, body: "Hi {first_name}" },
  { delayDays: 1, body: "First message" },
  { delayDays: 3, body: "Second message" },
];

describe("buildFlow", () => {
  it("draws the start, the request, every message and the hand-off nodes", () => {
    const g = buildFlow(steps);
    expect(g.nodes.map((n) => n.id)).toEqual([
      "start", "invite", "message-1", "message-2", "followup", "setter", "booked", "confirm",
    ]);
    expect(g.nodes.find((n) => n.id === "message-2")).toMatchObject({ kind: "message", step: 2, delayDays: 3 });
  });

  it("connects the sequence and ends at the confirmation", () => {
    const g = buildFlow(steps);
    expect(g.edges).toHaveLength(7);
    expect(g.edges[0]).toMatchObject({ from: "start", to: "invite" });
    expect(g.edges.at(-1)).toMatchObject({ from: "booked", to: "confirm" });
    const last = g.nodes.find((n) => n.id === "message-2")!;
    expect(g.edges.find((e) => e.id === "e-last-followup")?.from).toBe(last.id);
  });

  it("keeps the request and messages apart and inside the canvas", () => {
    const g = buildFlow(steps);
    const invite = g.nodes.find((n) => n.id === "invite")!;
    const first = g.nodes.find((n) => n.id === "message-1")!;
    expect(invite.y).toBeGreaterThan(g.nodes[0].y);
    expect(first.y).toBeGreaterThan(invite.y);
    for (const n of g.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.x + FLOW.nodeWidth).toBeLessThanOrEqual(g.width);
      expect(n.y + FLOW.nodeHeight).toBeLessThanOrEqual(g.height);
    }
  });

  it("still renders a draft with no messages yet", () => {
    const g = buildFlow([{ delayDays: 0, body: "" }]);
    expect(g.nodes.some((n) => n.id === "message-1")).toBe(false);
    expect(g.edges.find((e) => e.id === "e-last-followup")?.from).toBe("invite");
  });
});

describe("edgePath", () => {
  it("draws a side-to-side curve when the next node is to the right", () => {
    const g = buildFlow(steps);
    const start = g.nodes[0];
    const invite = g.nodes[1];
    expect(edgePath(start, invite)).toMatch(/^M .* C /);
    expect(nodeCentre(start)).toEqual({ x: FLOW.nodeWidth / 2, y: FLOW.nodeHeight / 2 });
  });
});
