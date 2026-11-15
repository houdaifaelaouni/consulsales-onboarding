/** Whether a workspace may be entered: only once its stage 1 invoice is paid. */
export function hasPaidEntry(rows: Array<{ stage: number; paid_at: string | null }> | null | undefined): boolean {
  return !!rows?.some((r) => r.stage === 1 && r.paid_at !== null);
}

/** Entry is open once stage 1 is paid (or waived), or while an admin-given free trial runs. */
export function mayEnter(rows: Array<{ stage: number; paid_at: string | null }> | null | undefined, trialUntil: string | null, now: Date): boolean {
  return hasPaidEntry(rows) || (trialUntil !== null && Date.parse(trialUntil) > now.getTime());
}
