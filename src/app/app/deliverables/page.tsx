import { DeliverableList } from "@/components/review/deliverable-list";
import { Notice } from "@/components/shell/notice";
import { t } from "@/lib/i18n";
import { loadDeliverables } from "@/lib/review/load";

export const dynamic = "force-dynamic";

export default async function ClientDeliverables() {
  let items;
  try { items = await loadDeliverables(); } catch {
    return <Notice icon="error" title={t("dash.error.title")} body={t("dash.error.body")} retryHref="/app/deliverables" retryLabel={t("dash.error.retry")} />;
  }
  if (items.length === 0) return <Notice icon="documents" title={t("review.none.title")} body={t("review.none.body")} />;
  return <DeliverableList items={items} base="/app/deliverables" />;
}
