export function EmptyState({
  title, body, action,
}: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-hairline-strong px-6 py-12 text-center">
      <h3 className="text-[22px] font-medium tracking-[-0.4px]">{title}</h3>
      <p className="max-w-sm text-ink-muted">{body}</p>
      {action}
    </div>
  );
}
