import { t } from "@/lib/i18n";
import { diffLines, diffStats, type DiffLine } from "@/lib/review/diff";
import { cx } from "@/utils/cx";

const mark = { same: " ", added: "+", removed: "−" } as const;

function Line({ l, side }: { l: DiffLine; side?: "left" | "right" }) {
  const hidden = (side === "left" && l.kind === "added") || (side === "right" && l.kind === "removed");
  return (
    <div
      className={cx("flex gap-2 px-3 py-1 font-mono text-[13px] leading-6", hidden && "invisible",
        l.kind === "added" && "bg-success-secondary text-primary", l.kind === "removed" && "bg-error-primary text-tertiary line-through decoration-quaternary")}
    >
      <span aria-hidden className="w-3 shrink-0 text-quaternary select-none">{mark[l.kind]}</span>
      <span className="min-w-0 break-words whitespace-pre-wrap">{hidden ? " " : l.text || " "}</span>
      {l.kind !== "same" && <span className="sr-only">{l.kind === "added" ? "(added)" : "(removed)"}</span>}
    </div>
  );
}

export function DiffView({ from, to }: { from: string; to: string }) {
  const lines = diffLines(from, to);
  const { added, removed } = diffStats(lines);
  if (added === 0 && removed === 0) return <p className="text-md text-tertiary">{t("review.diff.same")}</p>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-tertiary" role="status">{t("review.diff.summary", "en", { added, removed })}</p>
      {/* Phone: one column with + and − markers. Wider screens: side by side. */}
      <div className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary sm:hidden">
        {lines.map((l, i) => <Line key={i} l={l} />)}
      </div>
      <div className="hidden grid-cols-2 overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary sm:grid">
        <div className="border-r border-secondary">{lines.map((l, i) => <Line key={i} l={l} side="left" />)}</div>
        <div>{lines.map((l, i) => <Line key={i} l={l} side="right" />)}</div>
      </div>
    </div>
  );
}
