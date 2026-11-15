import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { diffLines, diffStats, type DiffLine } from "@/lib/review/diff";

const mark = { same: " ", added: "+", removed: "−" } as const;

function Line({ l, side }: { l: DiffLine; side?: "left" | "right" }) {
  const hidden = (side === "left" && l.kind === "added") || (side === "right" && l.kind === "removed");
  return (
    <div
      className={cn("flex gap-2 px-3 py-1 font-mono text-[13px] leading-6", hidden && "invisible",
        l.kind === "added" && "bg-surface-3 text-ink", l.kind === "removed" && "text-ink-subtle line-through decoration-ink-subtle/60")}
    >
      <span aria-hidden className="w-3 shrink-0 select-none text-ink-subtle">{mark[l.kind]}</span>
      <span className="min-w-0 break-words whitespace-pre-wrap">{hidden ? " " : l.text || " "}</span>
      {l.kind !== "same" && <span className="sr-only">{l.kind === "added" ? "(added)" : "(removed)"}</span>}
    </div>
  );
}

export function DiffView({ from, to }: { from: string; to: string }) {
  const lines = diffLines(from, to);
  const { added, removed } = diffStats(lines);
  if (added === 0 && removed === 0) return <p className="text-ink-muted">{t("review.diff.same")}</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted" role="status">{t("review.diff.summary", "en", { added, removed })}</p>
      {/* Phone: one column with + and − markers. Wider screens: side by side. */}
      <div className="overflow-hidden rounded-lg border border-hairline bg-surface-1 sm:hidden">
        {lines.map((l, i) => <Line key={i} l={l} />)}
      </div>
      <div className="hidden grid-cols-2 overflow-hidden rounded-lg border border-hairline bg-surface-1 sm:grid">
        <div className="border-r border-hairline">{lines.map((l, i) => <Line key={i} l={l} side="left" />)}</div>
        <div>{lines.map((l, i) => <Line key={i} l={l} side="right" />)}</div>
      </div>
    </div>
  );
}
