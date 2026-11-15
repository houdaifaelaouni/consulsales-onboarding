"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FC } from "react";
import {
  BarChart07, Calendar, CheckVerified02, CreditCard02, File05, Home01, Link01, LogOut01, Users01,
} from "@untitledui/icons";
import { NavList } from "@/components/application/app-navigation/base-components/nav-list";
import { MobileNavigationHeader } from "@/components/application/app-navigation/base-components/mobile-header";
import type { NavItemType } from "@/components/application/app-navigation/config";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { t } from "@/lib/i18n";
import { activeHref, type NavIcon, type NavItem } from "@/lib/nav";
import { Logo } from "./logo";

const ICONS: Record<NavIcon, FC<{ className?: string }>> = {
  overview: Home01, intake: File05, access: Link01, review: CheckVerified02, payments: CreditCard02, booking: Calendar, clients: Users01,
};

const SIDEBAR_WIDTH = 280;

export interface ShellUser { name: string; email: string }

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function AccountCard({ user, canSignOut }: { user: ShellUser; canSignOut: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-3 ring-1 ring-secondary ring-inset">
      <Avatar size="md" initials={initialsOf(user.name)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-primary">{user.name}</p>
        <p className="truncate text-xs text-tertiary">{user.email}</p>
      </div>
      {canSignOut && (
        <form action="/auth/signout" method="post">
          <Tooltip title={t("nav.signOut")}>
            <Button type="submit" color="tertiary" size="sm" iconLeading={LogOut01} aria-label={t("nav.signOut")} />
          </Tooltip>
        </form>
      )}
    </div>
  );
}

/** Dashboard layout: fixed sidebar on large screens, a slide-in menu on phones, content on the right. */
export function DashboardShell({ items, homeHref, user, canSignOut = false, footer, children }: {
  items: NavItem[]; homeHref: string; user: ShellUser; canSignOut?: boolean; footer?: React.ReactNode; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navItems: NavItemType[] = items.map((i) => ({ label: t(i.label), href: i.href, icon: ICONS[i.icon] ?? BarChart07 }));

  const sidebar = (
    <aside
      style={{ "--width": `${SIDEBAR_WIDTH}px` } as React.CSSProperties}
      className="flex h-full w-full max-w-full flex-col justify-between overflow-auto bg-primary pt-4 lg:w-(--width) lg:pt-5 border-secondary md:border-r"
    >
      <div className="px-4 lg:px-5">
        <Link href={homeHref} aria-label="ConsulSales"><Logo /></Link>
      </div>
      <nav aria-label={t("nav.main")}>
        <NavList activeUrl={activeHref(pathname, items)} items={navItems} />
      </nav>
      <div className="mt-auto flex flex-col gap-3 px-4 py-4 lg:py-5">
        {footer}
        <AccountCard user={user} canSignOut={canSignOut} />
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-secondary focus:px-3 focus:py-2 focus:text-sm focus:text-primary">
        {t("nav.skip")}
      </a>
      <MobileNavigationHeader>{sidebar}</MobileNavigationHeader>
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex">{sidebar}</div>
      {/* Takes up the sidebar's width because the real sidebar is fixed. */}
      <div style={{ paddingLeft: SIDEBAR_WIDTH }} className="invisible hidden lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block" />
      <div id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">{children}</div>
    </div>
  );
}
