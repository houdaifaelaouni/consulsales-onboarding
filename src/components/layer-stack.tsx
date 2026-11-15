import { t, type Locale } from "@/lib/i18n";

/** Isometric stack: one layer per stage, lit when that stage is complete. Bottom layer is stage 1. */
export function LayerStack({ completed, locale = "en" }: { completed: number; locale?: Locale }) {
  const layers = [0, 1, 2]; // bottom to top
  return (
    <svg
      viewBox="0 0 160 132" role="img" aria-label={t("layers.label", locale, { done: completed })}
      className="h-28 w-auto shrink-0"
    >
      {layers.map((i) => {
        const lit = i < completed;
        const y = 104 - i * 30;
        const top = `M80 ${y - 18} L140 ${y} L80 ${y + 18} L20 ${y} Z`;
        const left = `M20 ${y} L80 ${y + 18} L80 ${y + 26} L20 ${y + 8} Z`;
        const right = `M140 ${y} L80 ${y + 18} L80 ${y + 26} L140 ${y + 8} Z`;
        return (
          <g key={i} strokeWidth="1" strokeLinejoin="round" className="stroke-[var(--color-border-primary)]">
            <path d={left} className={lit ? "fill-[var(--color-brand-700)]" : "fill-[var(--color-bg-secondary)]"} />
            <path d={right} className={lit ? "fill-[var(--color-brand-600)]" : "fill-[var(--color-bg-primary)]"} />
            <path d={top} className={lit ? "fill-[var(--color-brand-400)]" : "fill-[var(--color-bg-tertiary)]"} />
          </g>
        );
      })}
    </svg>
  );
}
