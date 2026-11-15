import { AdminBoard } from "@/components/admin/admin-board";
import { Notice } from "@/components/shell/notice";
import { loadAdminClients } from "@/lib/admin/load";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  try {
    const clients = await loadAdminClients();
    return <AdminBoard clients={clients} now={new Date().toISOString()} clientsBase="/admin/clients" />;
  } catch {
    return <Notice icon="error" title={t("dash.error.title")} body={t("dash.error.body")} retryHref="/admin" retryLabel={t("dash.error.retry")} />;
  }
}
