import Link from "next/link";
import { Badge } from "@/components/base/badges/badges";
import { t } from "@/lib/i18n";
import type { Deliverable } from "@/lib/review/types";

const COLOR = { draft: "gray", in_review: "brand", changes_requested: "warning", approved: "success" } as const;

/** The client's list of deliverables. `base` is where each one opens: /demo/review or /app/deliverables. */
export function DeliverableList({ items, base }: { items: Deliverable[]; base: string }) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
      <h1 className="text-display-sm font-semibold text-primary">{t("review.title")}</h1>
      {items.length === 0 ? <p className="text-md text-tertiary">{t("review.list.empty")}</p> : (
        <ul className="flex flex-col gap-3">
          {items.map((d) => (
            <li key={d.id}>
              <Link href={`${base}/${d.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary transition hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
                <span className="flex flex-col gap-0.5">
                  <span className="text-lg font-semibold text-primary">{d.title}</span>
                  <span className="text-sm text-tertiary">{t("review.version", "en", { n: d.versions.length })}</span>
                </span>
                <Badge size="md" color={COLOR[d.status]}>{t(`review.status.${d.status}` as "review.status.draft")}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
