import { AdminBoard } from "@/components/admin/admin-board";
import { ADMIN_NOW, SAMPLE_CLIENTS } from "@/lib/admin/sample";

export default function DemoAdmin() {
  return (
    <AdminBoard clients={SAMPLE_CLIENTS} now={ADMIN_NOW} />
  );
}
