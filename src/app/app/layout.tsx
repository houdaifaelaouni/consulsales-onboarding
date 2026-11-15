import { redirect } from "next/navigation";
import { AreaSwitch } from "@/components/shell/area-switch";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { isStaff } from "@/lib/auth/access";
import { getViewer } from "@/lib/auth/viewer";
import { firstName } from "@/lib/home";
import { APP_NAV } from "@/lib/nav";

/** Client side. Everyone signed in may be here; staff also get a link to the admin side. */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return (
    <DashboardShell
      items={APP_NAV} homeHref="/app" user={{ name: firstName(viewer.name, viewer.email), email: viewer.email }} canSignOut
      footer={isStaff(viewer) ? <AreaSwitch to="admin" /> : undefined}
    >
      {children}
    </DashboardShell>
  );
}
