import type { MessageKey } from "@/lib/i18n";

export type NavIcon = "overview" | "intake" | "access" | "review" | "payments" | "booking" | "clients" | "welcome" | "integrations" | "account";
export interface NavItem { href: string; label: MessageKey; icon: NavIcon }

/** Demo area: every finished screen, on sample data. */
export const DEMO_NAV: NavItem[] = [
  { href: "/demo", label: "nav.overview", icon: "overview" },
  { href: "/demo/intake", label: "nav.intake", icon: "intake" },
  { href: "/demo/access", label: "nav.access", icon: "access" },
  { href: "/demo/review", label: "nav.review", icon: "review" },
  { href: "/demo/payments", label: "nav.payments", icon: "payments" },
  { href: "/demo/booking", label: "nav.booking", icon: "booking" },
  { href: "/demo/admin", label: "nav.clients", icon: "clients" },
  { href: "/demo/integrations", label: "nav.integrations", icon: "integrations" },
  { href: "/demo/outreach", label: "nav.outreach", icon: "overview" },
  { href: "/demo/outreach/agents", label: "outreach.tabs.agents", icon: "review" },
  { href: "/welcome", label: "nav.welcome", icon: "welcome" },
];

/** Client side: what a client sees. */
export const APP_NAV: NavItem[] = [
  { href: "/app", label: "nav.home", icon: "overview" },
  { href: "/app/intake", label: "nav.intake", icon: "intake" },
  { href: "/app/access", label: "nav.access", icon: "access" },
  { href: "/app/deliverables", label: "nav.review", icon: "review" },
  { href: "/app/payments", label: "nav.payments", icon: "payments" },
  { href: "/app/outreach", label: "nav.outreach", icon: "overview" },
  { href: "/app/booking", label: "nav.booking", icon: "booking" },
  { href: "/app/account", label: "nav.account", icon: "account" },
];

/** Admin side: the team's tools. Never shown to clients. */
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "nav.adminClients", icon: "clients" },
  { href: "/admin/agencies", label: "nav.adminAgencies", icon: "clients" },
  { href: "/admin/integrations", label: "nav.integrations", icon: "integrations" },
];

/**
 * A link is active on its own page and on pages beneath it (/demo/review/icp keeps "Deliverables" lit).
 * Index routes such as /app and /demo only match exactly, otherwise they would be active everywhere under them.
 */
export function isActive(pathname: string, href: string, opts: { exact?: boolean } = {}): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (href === "/admin") return path === href || path.startsWith("/admin/clients/"); // the clients board owns its detail pages
  if (opts.exact || href === "/app" || href === "/demo") return path === href;
  return path === href || path.startsWith(`${href}/`);
}

/** The single nav href that should be highlighted for a path, or undefined. */
export function activeHref(pathname: string, items: NavItem[]): string | undefined {
  return items.find((i) => isActive(pathname, i.href))?.href;
}
