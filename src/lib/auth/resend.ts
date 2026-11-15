/** Seconds before another sign-in link may be requested. Stops accidental double sends and email-bombing. */
export const RESEND_SECONDS = 30;

/** Whole seconds left in the cooldown after a send, never below 0. */
export function cooldownLeft(sentAt: number, now: number, seconds = RESEND_SECONDS): number {
  return Math.max(0, Math.ceil(seconds - (now - sentAt) / 1000));
}

/** A quick shape check before calling the server. The server still decides who may sign in. */
export function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}
