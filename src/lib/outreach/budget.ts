/**
 * One LinkedIn account has one daily limit, and it may run several campaigns. The planner splits the limit equally and
 * rounds each share up, so the sum can be a few over the limit but never silently starves a campaign. The database still
 * refuses anything above the hard cap, so rounding up cannot raise the real ceiling.
 */
export function splitBudget(total: number, profiles: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const n = Math.max(1, Math.floor(profiles));
  return Math.ceil(total / n);
}

/** The same split as a list, biggest share first, adding back to the total exactly. */
export function splitShares(total: number, profiles: number): number[] {
  const n = Math.max(1, Math.floor(profiles));
  if (!Number.isFinite(total) || total <= 0) return Array.from({ length: n }, () => 0);
  const each = Math.floor(total / n);
  const rest = total - each * n;
  return Array.from({ length: n }, (_, i) => each + (i < rest ? 1 : 0));
}
