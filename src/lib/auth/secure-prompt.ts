/** How long "Not now" hides the reminder. */
export const SNOOZE_DAYS = 7;
const DAY_MS = 86_400_000;

/** Show the "secure your account" reminder only while there is no PIN and it has not been snoozed recently. */
export function shouldPrompt(input: { pin: "on" | "off" | "unavailable"; dismissedAt: number | null; now: number }): boolean {
  if (input.pin !== "off") return false;
  if (input.dismissedAt === null || Number.isNaN(input.dismissedAt)) return true;
  return input.now - input.dismissedAt >= SNOOZE_DAYS * DAY_MS;
}
