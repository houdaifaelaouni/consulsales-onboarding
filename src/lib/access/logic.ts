import { BLOCKED_ESCALATION_HOURS, MAX_FILE_BYTES, type AccessStatus } from "./items";

export interface AccessState { status: AccessStatus; blockedSince?: string; detail?: string }
export type AccessStates = Record<string, AccessState | undefined>;

const HOUR_MS = 3_600_000;

/** Blocked items older than 72 h raise an admin flag (FR-10, PDR notifications). */
export function needsAdminFlag(state: AccessState | undefined, now = new Date()): boolean {
  if (state?.status !== "blocked" || !state.blockedSince) return false;
  return now.getTime() - Date.parse(state.blockedSince) >= BLOCKED_ESCALATION_HOURS * HOUR_MS;
}

export function statusOf(states: AccessStates, id: string): AccessStatus {
  return states[id]?.status ?? "pending";
}

export function connectedCount(states: AccessStates, ids: string[]): { done: number; total: number } {
  return { done: ids.filter((id) => statusOf(states, id) === "connected").length, total: ids.length };
}

export type FileCheck = { ok: true } | { ok: false; reason: "too_big" | "empty" | "type" };

const ALLOWED_PREFIXES = ["image/", "application/pdf"];

/** Brand file rules: up to 200 MB, non-empty, image or PDF. */
export function checkFile(file: { size: number; type: string }): FileCheck {
  if (file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: "too_big" };
  if (!ALLOWED_PREFIXES.some((p) => file.type.startsWith(p))) return { ok: false, reason: "type" };
  return { ok: true };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Accepts http(s) URLs only, so a pasted script or file path is rejected. */
export function isValidBookingLink(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch { return false; }
}
