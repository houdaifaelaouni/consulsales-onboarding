import { t } from "@/lib/i18n";

/**
 * A decorative "card" that shows what is being paid for. It is a picture, not a form: card details are only ever typed into
 * Whop's own checkout next to it.
 */
export function PlanCard({ planTitle, amount, holder, company }: { planTitle: string; amount: string; holder: string; company: string }) {
  return (
    <figure className="flex w-full max-w-sm flex-col gap-3">
      <div
        aria-hidden="true"
        className="relative aspect-[1.586] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-800 to-gray-950 p-6 text-white ring-1 ring-white/10"
      >
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 -left-10 size-56 rounded-full bg-white/5" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-lg font-semibold tracking-tight">ConsulSales</span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">{planTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-8 w-11 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500 opacity-90" />
            <span className="font-mono text-sm tracking-[0.25em] text-white/80">•••• •••• •••• 0001</span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] tracking-wider text-white/60 uppercase">{t("entry.card.holder")}</p>
              <p className="truncate text-sm font-medium uppercase">{holder}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] tracking-wider text-white/60 uppercase">{t("entry.card.stage")}</p>
              <p className="text-xl font-semibold">{amount}</p>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-center text-sm text-tertiary">{t("entry.card.caption", "en", { company })}</figcaption>
    </figure>
  );
}
