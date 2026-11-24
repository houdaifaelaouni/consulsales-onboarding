/**
 * The numbers behind the Campaign tab. Every value comes from the database (enrollments and the send log), so the
 * screen only formats them. Nothing here invents a metric: a rate with no denominator is 0, never NaN.
 */
export interface CampaignCounts {
  leads: number;
  invites: number;
  messages: number;
  accepted: number;
  replies: number;
  positive: number;
  conversations: number;
  meetings: number;
  completed: number;
  failed: number;
  stopped: number;
  /** Sends the provider refused (for example a wrong profile id) — taken out of the adjusted reply rate. */
  failedSends: number;
}

export type RateKey =
  | "acceptance"
  | "reply"
  | "adjusted"
  | "positiveOfReplies"
  | "positiveOfMessages"
  | "conversationsOfReplies"
  | "meetingsOfPositive"
  | "meetingsOfMessages";

/** A percentage with one decimal, clamped to 0..100 and never NaN. */
export function pct(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || part <= 0 || whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 1000) / 10);
}

export function rates(c: CampaignCounts): Record<RateKey, number> {
  const landed = Math.max(0, c.messages - c.failedSends);
  return {
    acceptance: pct(c.accepted, c.invites),
    reply: pct(c.replies, c.messages),
    adjusted: pct(c.replies, landed),
    positiveOfReplies: pct(c.positive, c.replies),
    positiveOfMessages: pct(c.positive, c.messages),
    conversationsOfReplies: pct(c.conversations, c.replies),
    meetingsOfPositive: pct(c.meetings, c.positive),
    meetingsOfMessages: pct(c.meetings, c.messages),
  };
}

export interface QueueInput { pending: number; inProgress: number; completed: number; failed: number; steps?: Array<{ step: number; leads: number }> }
export interface QueueView { pending: number; inProgress: number; completed: number; failed: number; total: number; overall: number; steps: Array<{ step: number; leads: number }> }

/** Queue Status card: the four buckets, their total and how much of the chain is finished. */
export function queueStatus(input: QueueInput): QueueView {
  const total = [input.pending, input.inProgress, input.completed, input.failed].reduce((n, v) => n + Math.max(0, v), 0);
  return {
    pending: Math.max(0, input.pending),
    inProgress: Math.max(0, input.inProgress),
    completed: Math.max(0, input.completed),
    failed: Math.max(0, input.failed),
    total,
    overall: pct(input.completed, total),
    steps: (input.steps ?? []).map((s) => ({ step: s.step, leads: Math.max(0, s.leads) })),
  };
}

/** The campaigns list progress bar. */
export function campaignProgress(completed: number, total: number): number {
  return pct(completed, total);
}
