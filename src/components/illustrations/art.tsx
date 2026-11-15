/**
 * Original line-and-shape illustrations that follow the theme tokens. Decorative: hidden from
 * screen readers (the text next to them says the same thing).
 */
type Kind = "welcome" | "waiting" | "payment" | "review" | "error";

const B = { s: "var(--color-brand-600)", l: "var(--color-brand-400)", d: "var(--color-brand-700)" };
const N = { line: "var(--color-border-primary)", bg: "var(--color-bg-secondary)", card: "var(--color-bg-primary)", t: "var(--color-bg-tertiary)" };

function Scene({ kind }: { kind: Kind }) {
  switch (kind) {
    case "welcome":
      return (
        <>
          <rect x="30" y="92" width="140" height="8" rx="4" fill={N.t} />
          <path d="M60 92 V52 L100 30 L140 52 V92 Z" fill={N.card} stroke={N.line} strokeWidth="2" strokeLinejoin="round" />
          <path d="M100 30 V10" stroke={B.s} strokeWidth="3" strokeLinecap="round" />
          <path d="M100 10 L124 18 L100 26 Z" fill={B.s} />
          <rect x="88" y="62" width="24" height="30" rx="4" fill={B.l} />
          <circle cx="106" cy="78" r="2" fill={B.d} />
          <circle cx="50" cy="44" r="4" fill={B.l} /><circle cx="156" cy="40" r="3" fill={B.s} /><circle cx="162" cy="66" r="2" fill={B.l} />
        </>
      );
    case "waiting":
      return (
        <>
          <circle cx="100" cy="56" r="38" fill={N.card} stroke={N.line} strokeWidth="2" />
          <path d="M100 30 V56 L118 68" stroke={B.s} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="100" cy="56" r="4" fill={B.d} />
          <path d="M40 100 H160" stroke={N.line} strokeWidth="2" strokeLinecap="round" strokeDasharray="2 8" />
          <circle cx="44" cy="30" r="3" fill={B.l} /><circle cx="160" cy="26" r="4" fill={B.l} />
        </>
      );
    case "payment":
      return (
        <>
          <rect x="44" y="30" width="112" height="70" rx="10" fill={N.card} stroke={N.line} strokeWidth="2" />
          <rect x="44" y="44" width="112" height="14" fill={B.l} />
          <rect x="58" y="74" width="34" height="6" rx="3" fill={N.t} /><rect x="58" y="86" width="20" height="5" rx="2.5" fill={N.t} />
          <circle cx="146" cy="30" r="16" fill={B.s} />
          <path d="M138 30 L144 36 L155 24" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      );
    case "review":
      return (
        <>
          <rect x="52" y="18" width="84" height="92" rx="8" fill={N.card} stroke={N.line} strokeWidth="2" />
          <rect x="64" y="32" width="40" height="6" rx="3" fill={B.l} />
          <rect x="64" y="46" width="60" height="5" rx="2.5" fill={N.t} /><rect x="64" y="58" width="52" height="5" rx="2.5" fill={N.t} />
          <rect x="64" y="70" width="58" height="5" rx="2.5" fill={N.t} />
          <circle cx="138" cy="88" r="22" fill={B.s} />
          <path d="M128 88 L136 96 L150 80" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      );
    case "error":
      return (
        <>
          <path d="M100 18 L160 100 H40 Z" fill={N.card} stroke={N.line} strokeWidth="2" strokeLinejoin="round" />
          <path d="M100 48 V72" stroke={B.s} strokeWidth="5" strokeLinecap="round" />
          <circle cx="100" cy="86" r="3.5" fill={B.s} />
          <circle cx="42" cy="38" r="3" fill={B.l} /><circle cx="166" cy="50" r="3" fill={B.l} />
        </>
      );
  }
}

export function Art({ kind, className = "h-32 w-auto" }: { kind: Kind; className?: string }) {
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true" focusable="false" className={className}>
      <ellipse cx="100" cy="104" rx="70" ry="8" fill={N.bg} />
      <Scene kind={kind} />
    </svg>
  );
}
