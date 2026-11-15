import { AdminBoard } from "@/components/admin/admin-board";
import { PreviewNote } from "@/components/shell/preview-note";
import { ADMIN_NOW, SAMPLE_CLIENTS } from "@/lib/admin/sample";

// TODO(backend): read workspaces, tasks, access and invoices through the admin's own session.
export default function AdminHome() {
  return (<><PreviewNote /><AdminBoard clients={SAMPLE_CLIENTS} now={ADMIN_NOW} clientsBase="/admin/clients" /></>);
}
