/** Hard limits. The database enforces the same numbers (outreach_settings checks): keep both in step. */
export const CAPS = { invitesPerDay: 30, messagesPerDay: 50, earliest: "06:00", latest: "22:00" } as const;

export interface OutreachSettings {
  invitesPerDay: number;
  messagesPerDay: number;
  workStart: string;
  workEnd: string;
  timezone: string;
  weekdaysOnly: boolean;
  warmup: boolean;
}

export const DEFAULT_SETTINGS: OutreachSettings = { invitesPerDay: 15, messagesPerDay: 30, workStart: "08:00", workEnd: "18:00", timezone: "Europe/Madrid", weekdaysOnly: true, warmup: true };

export const TIMEZONES = [
  "Europe/Madrid", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Lisbon", "Europe/Amsterdam", "Europe/Rome", "Africa/Casablanca",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Sao_Paulo", "America/Mexico_City",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Shanghai", "Asia/Tokyo", "Australia/Sydney",
] as const;

export type SettingsField = "invitesPerDay" | "messagesPerDay" | "hours" | "timezone";
export type SettingsCheck = { ok: true; value: OutreachSettings } | { ok: false; field: SettingsField };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const wholeInRange = (v: unknown, max: number) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;

/** Checks what a client typed against the hard limits. The first problem found names the field to fix. */
export function validateSettings(input: OutreachSettings): SettingsCheck {
  if (!wholeInRange(input.invitesPerDay, CAPS.invitesPerDay)) return { ok: false, field: "invitesPerDay" };
  if (!wholeInRange(input.messagesPerDay, CAPS.messagesPerDay)) return { ok: false, field: "messagesPerDay" };
  const { workStart: s, workEnd: e } = input;
  if (!TIME.test(s) || !TIME.test(e) || s < CAPS.earliest || e > CAPS.latest || e <= s) return { ok: false, field: "hours" };
  if (!(TIMEZONES as readonly string[]).includes(input.timezone)) return { ok: false, field: "timezone" };
  return { ok: true, value: input };
}

export type SendingState = "no_account" | "needs_reconnect" | "stopped_by_admin" | "paused" | "sending";

/** What the Outreach tab says about sending. Order matters: an admin stop beats the client's own switch. */
export function sendingState(i: { accountStatuses: string[]; paused: boolean; adminStopped: boolean }): SendingState {
  if (i.adminStopped) return "stopped_by_admin";
  if (i.accountStatuses.length === 0) return "no_account";
  if (!i.accountStatuses.includes("ok")) return "needs_reconnect";
  return i.paused ? "paused" : "sending";
}

/** Postgres "08:00:00" to the "08:00" a time input uses. */
export const shortTime = (t: string): string => t.slice(0, 5);
