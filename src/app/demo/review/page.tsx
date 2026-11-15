import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { t } from "@/lib/i18n";
import { SAMPLE_DELIVERABLES } from "@/lib/review/sample";

export default function ReviewList() {
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-8 sm:py-12">
      <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px]">{t("review.title")}</h1>
      <ul className="space-y-3">
        {SAMPLE_DELIVERABLES.map((d) => (
          <li key={d.id}>
            <Link href={`/demo/review/${d.id}`} className="block">
              <Card className="flex items-center justify-between gap-3 transition-colors hover:bg-surface-2">
                <div>
                  <h2 className="text-[22px] font-medium tracking-[-0.4px]">{d.title}</h2>
                  <p className="text-sm text-ink-subtle">Version {d.versions.length}</p>
                </div>
                <Badge tone={d.status === "approved" ? "success" : "neutral"}>{t(`review.status.${d.status}` as "review.status.draft")}</Badge>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
