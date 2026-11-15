/** Welcome flow logic: pure and tested. The screen only renders what this returns. */
export const STEP_IDS = ["trail", "goals", "access", "kickoff", "ready"] as const;
export type StepId = (typeof STEP_IDS)[number];

export type AccessChoice = "seat" | "delegate" | "later";
export const ACCESS_CHOICES: AccessChoice[] = ["seat", "delegate", "later"];
export const CLOSE_RATES = [10, 20, 30, 40] as const;

export interface Goals { callsPerMonth: number; dealValue: number; closeRate: number }

export interface WelcomeState {
  step: number;
  goals: Goals;
  access: AccessChoice;
  /** ISO time of the booked kickoff call, or null. */
  kickoff: string | null;
  /** Steps the person chose to skip, so the last screen can list what is left. */
  skipped: StepId[];
}

export const LIMITS = { calls: { min: 4, max: 40 }, deal: { min: 0, max: 1_000_000 } } as const;

export const DEFAULT_STATE: WelcomeState = {
  step: 0,
  goals: { callsPerMonth: 12, dealValue: 6000, closeRate: 20 },
  access: "seat",
  kickoff: null,
  skipped: [],
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const finite = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export const lastStep = STEP_IDS.length - 1;
export const clampStep = (n: number) => clamp(Math.trunc(n) || 0, 0, lastStep);

/** Percent of the way through, counting the current step as started: step 1 of 5 is 20%. */
export function stepProgress(step: number): number {
  return Math.round(((clampStep(step) + 1) / STEP_IDS.length) * 100);
}

/** Illustration from the person's own numbers. Closed deals are rounded to one decimal. */
export function estimate(g: Goals): { newClients: number; monthlyRevenue: number } {
  const newClients = Math.round(((g.callsPerMonth * g.closeRate) / 100) * 10) / 10;
  return { newClients, monthlyRevenue: Math.round(newClients * g.dealValue) };
}

/** Whether Continue is allowed. Only goals needs a value; every other step has a skip. */
export function canContinue(s: WelcomeState): boolean {
  if (STEP_IDS[s.step] === "goals") return s.goals.dealValue > 0 && s.goals.callsPerMonth >= LIMITS.calls.min;
  return true;
}

export function next(s: WelcomeState): WelcomeState {
  return { ...s, step: clampStep(s.step + 1) };
}
export function back(s: WelcomeState): WelcomeState {
  return { ...s, step: clampStep(s.step - 1) };
}

/** Skipping moves on and remembers it. Never skips the final screen, and never records a step twice. */
export function skip(s: WelcomeState): WelcomeState {
  const id = STEP_IDS[s.step];
  if (s.step >= lastStep) return s;
  const skipped = s.skipped.includes(id) ? s.skipped : [...s.skipped, id];
  return { ...s, skipped, step: clampStep(s.step + 1) };
}

/** Doing a step for real removes it from the "later" list. */
export function markDone(s: WelcomeState, id: StepId): WelcomeState {
  return { ...s, skipped: s.skipped.filter((x) => x !== id) };
}

/** What is still open on the final screen. Kickoff counts as open until a time is booked. */
export function remaining(s: WelcomeState): StepId[] {
  const open: StepId[] = [];
  if (s.access === "later" || s.skipped.includes("access")) open.push("access");
  if (!s.kickoff) open.push("kickoff");
  return open;
}

export type Milestone = { id: string; days: string; unlocks: boolean };
export const TRAIL_IDS = ["paid", "intake", "icp", "profile", "live", "content"] as const;
export type TrailStatus = "done" | "current" | "locked";

/** The 30-day trail: everything before the current node is done, everything after is locked. */
export function trailStatus(index: number, current: number): TrailStatus {
  return index < current ? "done" : index === current ? "current" : "locked";
}

/** Reads saved state defensively: bad JSON or out-of-range values never break the page. */
export function parseState(raw: string | null | undefined): WelcomeState {
  if (!raw) return DEFAULT_STATE;
  try {
    const o = JSON.parse(raw) as Partial<WelcomeState> & { goals?: Partial<Goals> };
    const g: Partial<Goals> = o.goals ?? {};
    const rate = CLOSE_RATES.find((r) => r === g.closeRate) ?? DEFAULT_STATE.goals.closeRate;
    return {
      step: clampStep(Number(o.step)),
      goals: {
        callsPerMonth: clamp(Math.round(finite(g.callsPerMonth) ?? DEFAULT_STATE.goals.callsPerMonth), LIMITS.calls.min, LIMITS.calls.max),
        // An explicit 0 is kept (the person cleared it); a missing or invalid value falls back to the default.
        dealValue: clamp(Math.round(finite(g.dealValue) ?? DEFAULT_STATE.goals.dealValue), LIMITS.deal.min, LIMITS.deal.max),
        closeRate: rate,
      },
      access: ACCESS_CHOICES.includes(o.access as AccessChoice) ? (o.access as AccessChoice) : DEFAULT_STATE.access,
      kickoff: typeof o.kickoff === "string" && !Number.isNaN(Date.parse(o.kickoff)) ? o.kickoff : null,
      skipped: Array.isArray(o.skipped) ? o.skipped.filter((x): x is StepId => STEP_IDS.includes(x as StepId)) : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export const serialize = (s: WelcomeState): string => JSON.stringify(s);
