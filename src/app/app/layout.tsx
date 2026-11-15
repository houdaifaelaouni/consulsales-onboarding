import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { firstName } from "@/lib/home";
import { APP_NAV } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("app_user").select("name").eq("id", user.id).maybeSingle();
  const email = user.email ?? "";
  return (
    <DashboardShell items={APP_NAV} homeHref="/app" user={{ name: firstName(profile?.name, email), email }} canSignOut>
      {children}
    </DashboardShell>
  );
}
