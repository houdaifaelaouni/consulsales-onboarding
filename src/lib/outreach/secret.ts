import { timingSafeEqual } from "node:crypto";

/** True when `got` equals the configured webhook secret. False when no secret is set, so an unconfigured server accepts nothing. */
export function secretMatches(got: string | null | undefined, want: string | undefined): boolean {
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
