/** Whether a workspace may be entered: only once its stage 1 invoice is paid. */
export function hasPaidEntry(rows: Array<{ stage: number; paid_at: string | null }> | null | undefined): boolean {
  return !!rows?.some((r) => r.stage === 1 && r.paid_at !== null);
}
