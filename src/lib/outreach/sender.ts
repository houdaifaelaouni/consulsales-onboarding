/**
 * Deciding what may be sent right now. Pure, so every rule is tested here and the same rules are re-checked in
 * `outreach_record_send`: the planner paces the work, the database refuses anything above the hard caps.
 */
import type { OutreachSettings } from "./settings";

export type SendSettings = Pick<
  OutreachSettings,
  "invitesPerDay" | "messagesPerDay" | "workStart" | "workEnd" | "timezone" | "weekdaysOnly" | "warmup"
>;

/** One step of one enrolment that is due: an invitation, or a message once the invitation was accepted. */
export interface DueSend {
  enrollmentId: string;
  leadId: string;
  campaignId: string;
  position: number;
  kind: "invite" | "message";
  /** The step's text, with {placeholders} still in it. */
  body: string;
  leadName: string;
  leadTitle: string | null;
  leadCompany: string | null;
  linkedinKey: string;
  providerId: string | null;
  chatId: string | null;
  acceptedAt: string | null;
  dueAt: string;
}

export type SendBlock = "stopped_by_admin" | "needs_reconnect" | "no_account" | "paused" | "outside_hours" | "nothing_due";
export interface SendPlan {
  block: SendBlock | null;
  sends: DueSend[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MINUTES = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** The wall clock in the workspace's time zone: minutes since midnight and 0 = Monday. */
export function zonedNow(now: Date, timezone: string): { minutes: number; weekday: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone, hourCycle: "h23", hour: "2-digit", minute: "2-digit", weekday: "short",
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const weekday = WEEKDAYS.indexOf(get("weekday"));
    return { minutes: Number(get("hour")) * 60 + Number(get("minute")), weekday: weekday < 0 ? 0 : weekday };
  } catch {
    return { minutes: now.getUTCHours() * 60 + now.getUTCMinutes(), weekday: (now.getUTCDay() + 6) % 7 };
  }
}

/** Working hours are half-open: 08:00 is inside, 18:00 is not. Weekends are out when the client asked for weekdays. */
export function withinWindow(s: Pick<SendSettings, "workStart" | "workEnd" | "timezone" | "weekdaysOnly">, now: Date): boolean {
  const { minutes, weekday } = zonedNow(now, s.timezone);
  if (s.weekdaysOnly && weekday >= 5) return false;
  return minutes >= MINUTES(s.workStart) && minutes < MINUTES(s.workEnd);
}

/**
 * A warm-up ramp on top of the client's own daily goal: about a third of it in days 1-3, two thirds in days 4-7,
 * the whole goal from day 8. A goal of 0 stays 0.
 */
export function warmupLimit(goal: number, day: number): number {
  if (goal <= 0) return 0;
  if (day <= 0) return Math.min(goal, 1);
  const share = day <= 3 ? 1 / 3 : day <= 7 ? 2 / 3 : 1;
  return Math.max(1, Math.min(goal, Math.round(goal * share)));
}

/** Whole days since the first campaign was launched; 0 before that. */
export function dayOfWarmup(start: string | null, now: Date): number {
  if (!start) return 0;
  const ms = now.getTime() - new Date(start).getTime();
  return ms < 0 ? 0 : Math.floor(ms / 86_400_000) + 1;
}

export function dailyLimit(s: SendSettings, kind: DueSend["kind"], warmupStart: string | null, now: Date): number {
  const goal = kind === "invite" ? s.invitesPerDay : s.messagesPerDay;
  return s.warmup ? warmupLimit(goal, dayOfWarmup(warmupStart, now)) : goal;
}

const byDue = (a: DueSend, b: DueSend) => (a.dueAt === b.dueAt ? a.enrollmentId.localeCompare(b.enrollmentId) : a.dueAt.localeCompare(b.dueAt));

/**
 * The sends this run may make: nothing when sending is stopped, paused, the account is not healthy or the clock is
 * outside the working window; then the due items in time order, inside today's remaining budget for each kind.
 */
export function planSends(i: {
  now: Date;
  settings: SendSettings;
  paused: boolean;
  adminStopped: boolean;
  accountStatus: string | null;
  warmupStart: string | null;
  sentToday: { invites: number; messages: number };
  due: DueSend[];
  batch: number;
}): SendPlan {
  if (i.adminStopped) return { block: "stopped_by_admin", sends: [] };
  if (!i.accountStatus) return { block: "no_account", sends: [] };
  if (i.accountStatus !== "ok") return { block: "needs_reconnect", sends: [] };
  if (i.paused) return { block: "paused", sends: [] };
  if (!withinWindow(i.settings, i.now)) return { block: "outside_hours", sends: [] };

  let invitesLeft = dailyLimit(i.settings, "invite", i.warmupStart, i.now) - i.sentToday.invites;
  let messagesLeft = dailyLimit(i.settings, "message", i.warmupStart, i.now) - i.sentToday.messages;
  const sends: DueSend[] = [];
  for (const d of [...i.due].sort(byDue)) {
    if (sends.length >= i.batch) break;
    if (d.kind === "invite" && d.position === 0 && invitesLeft > 0) {
      sends.push(d);
      invitesLeft--;
    } else if (d.kind === "message" && d.position > 0 && d.acceptedAt && messagesLeft > 0) {
      sends.push(d);
      messagesLeft--;
    }
  }
  return { block: sends.length ? null : "nothing_due", sends };
}
