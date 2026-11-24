import { describe, expect, it } from "vitest";
import { campaignProgress, pct, queueStatus, rates, type CampaignCounts } from "./analytics";

const base: CampaignCounts = {
  leads: 1318, invites: 338, messages: 305, accepted: 146, replies: 110, positive: 74, conversations: 107,
  meetings: 8, completed: 201, failed: 0, stopped: 12, failedSends: 57,
};

describe("pct", () => {
  it("rounds to one decimal", () => {
    expect(pct(146, 338)).toBe(43.2);
    expect(pct(110, 305)).toBe(36.1);
    expect(pct(19, 120)).toBe(15.8);
  });
  it("never divides by zero or goes past 100", () => {
    expect(pct(5, 0)).toBe(0);
    expect(pct(0, 10)).toBe(0);
    expect(pct(12, 10)).toBe(100);
    expect(pct(Number.NaN, 10)).toBe(0);
  });
});

describe("rates", () => {
  const r = rates(base);
  it("computes every tile from the counts", () => {
    expect(r.acceptance).toBe(43.2);
    expect(r.reply).toBe(36.1);
    expect(r.positiveOfReplies).toBe(67.3);
    expect(r.meetingsOfPositive).toBe(10.8);
  });
  it("takes failed sends out of the adjusted reply rate", () => {
    expect(r.adjusted).toBe(44.4); // 110 of 248 delivered
    expect(r.adjusted).toBeGreaterThanOrEqual(r.reply);
  });
  it("returns zeros for an empty campaign", () => {
    const empty = rates({ leads: 0, invites: 0, messages: 0, accepted: 0, replies: 0, positive: 0, conversations: 0, meetings: 0, completed: 0, failed: 0, stopped: 0, failedSends: 0 });
    expect(Object.values(empty).every((v) => v === 0)).toBe(true);
  });
});

describe("queueStatus", () => {
  it("totals the four buckets and shows finished work as a percentage", () => {
    const q = queueStatus({ pending: 791, inProgress: 326, completed: 201, failed: 0 });
    expect(q.total).toBe(1318);
    expect(q.overall).toBe(15.3);
  });
  it("survives an empty queue", () => {
    const q = queueStatus({ pending: 0, inProgress: 0, completed: 0, failed: 0 });
    expect(q.total).toBe(0);
    expect(q.overall).toBe(0);
    expect(q.steps).toEqual([]);
  });
  it("keeps the per-step chips", () => {
    expect(queueStatus({ pending: 1, inProgress: 0, completed: 0, failed: 0, steps: [{ step: 1, leads: 328 }] }).steps).toEqual([{ step: 1, leads: 328 }]);
  });
});

describe("campaignProgress", () => {
  it("is finished leads over enrolled leads", () => {
    expect(campaignProgress(201, 580)).toBe(34.7);
    expect(campaignProgress(0, 0)).toBe(0);
  });
});
