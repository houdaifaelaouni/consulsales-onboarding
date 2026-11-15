import { AlertCircle, File05 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Button } from "@/components/base/buttons/button";
import { DeliverableList } from "@/components/review/deliverable-list";
import { t } from "@/lib/i18n";
import { loadDeliverables } from "@/lib/review/load";

export const dynamic = "force-dynamic";

function Notice({ error }: { error?: boolean }) {
  return (
    <main className="mx-auto flex max-w-7xl px-4 py-16 lg:px-8">
      <EmptyState className="mx-auto">
        <EmptyState.Header><EmptyState.FeaturedIcon icon={error ? AlertCircle : File05} color={error ? "error" : "gray"} /></EmptyState.Header>
        <EmptyState.Content>
          <EmptyState.Title>{error ? t("dash.error.title") : t("review.none.title")}</EmptyState.Title>
          <EmptyState.Description>{error ? t("dash.error.body") : t("review.none.body")}</EmptyState.Description>
        </EmptyState.Content>
        {error && <EmptyState.Footer><Button color="secondary" href="/app/deliverables">{t("dash.error.retry")}</Button></EmptyState.Footer>}
      </EmptyState>
    </main>
  );
}

export default async function ClientDeliverables() {
  let items;
  try { items = await loadDeliverables(); } catch { return <Notice error />; }
  if (items.length === 0) return <Notice />;
  return <DeliverableList items={items} base="/app/deliverables" />;
}
