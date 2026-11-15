import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";

/** Metric card in the Untitled UI style. Server-safe; the progress bar is the only client part. */
export function StatCard({ label, value, hint, progress }: { label: string; value: string; hint?: string; progress?: { value: number; max: number } }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary">
      <p className="text-sm font-medium text-tertiary">{label}</p>
      <p className="text-display-sm font-semibold text-primary">{value}</p>
      {progress && <ProgressBarBase value={progress.value} max={progress.max} aria-hidden />}
      {hint && <p className="text-sm text-tertiary">{hint}</p>}
    </div>
  );
}
