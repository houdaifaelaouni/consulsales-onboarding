import { AlertCircle } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Button } from "@/components/base/buttons/button";
import { AdminBoard } from "@/components/admin/admin-board";
import { loadAdminClients } from "@/lib/admin/load";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  try {
    const clients = await loadAdminClients();
    return <AdminBoard clients={clients} now={new Date().toISOString()} clientsBase="/admin/clients" />;
  } catch {
    return (
      <main className="mx-auto flex max-w-7xl px-4 py-16 lg:px-8">
        <EmptyState className="mx-auto">
          <EmptyState.Header><EmptyState.FeaturedIcon icon={AlertCircle} color="error" /></EmptyState.Header>
          <EmptyState.Content>
            <EmptyState.Title>{t("dash.error.title")}</EmptyState.Title>
            <EmptyState.Description>{t("dash.error.body")}</EmptyState.Description>
          </EmptyState.Content>
          <EmptyState.Footer><Button color="secondary" href="/admin">{t("dash.error.retry")}</Button></EmptyState.Footer>
        </EmptyState>
      </main>
    );
  }
}
