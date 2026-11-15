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
          <g key={i} strokeWidth="1" strokeLinejoin="round" className="stroke-hairline-strong">
            <path d={left} className={lit ? "fill-primary-focus" : "fill-surface-2"} />
            <path d={right} className={lit ? "fill-primary" : "fill-surface-1"} />
            <path d={top} className={lit ? "fill-primary-hover" : "fill-surface-3"} />
          </g>
        );
      })}
    </svg>
  );
}
