import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AreaSwitch } from "@/components/shell/area-switch";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { landingFor } from "@/lib/auth/access";
import { getViewer } from "@/lib/auth/viewer";
import { firstName } from "@/lib/home";
import { t } from "@/lib/i18n";
import { ADMIN_NAV } from "@/lib/nav";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Admin side. Checked on the server on every request: a client who opens /admin is sent back to /app. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const verdict = landingFor("admin", viewer);
  if (verdict !== "ok") redirect(verdict);
  return (
    <DashboardShell
      items={ADMIN_NAV} homeHref="/admin" areaLabel={t("area.admin")} canSignOut
      user={{ name: firstName(viewer.name, viewer.email), email: viewer.email }}
      footer={<AreaSwitch to="client" />}
    >
      {children}
    </DashboardShell>
  );
}
