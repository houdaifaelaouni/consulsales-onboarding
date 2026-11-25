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
