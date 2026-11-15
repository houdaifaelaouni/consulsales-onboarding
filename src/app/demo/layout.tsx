import Link from "next/link";
import type { Metadata } from "next";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { DEMO_NAV } from "@/lib/nav";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Demo", robots: { index: false, follow: false } };

const DEMO_USER = { name: "Sara Lopez", email: "sara@studionorth.example" };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell items={DEMO_NAV} homeHref="/demo" user={DEMO_USER}>
      <div className="border-b border-secondary bg-secondary px-4 py-2 text-center text-xs text-tertiary">
        {t("nav.demoNotice")}{" "}
        <Link href="/demo" className="text-primary underline underline-offset-2">{t("nav.allScreens")}</Link>
      </div>
      {children}
    </DashboardShell>
  );
}
