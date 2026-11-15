import type { MessageKey } from "@/lib/i18n";

export type NavIcon = "overview" | "intake" | "access" | "review" | "payments" | "booking" | "clients";
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
];

/** Client area. More links arrive as each screen gets wired to real data. */
export const APP_NAV: NavItem[] = [{ href: "/app", label: "nav.home", icon: "overview" }];

/**
 * A link is active on its own page and on pages beneath it (/demo/review/icp keeps "Deliverables" lit).
 * Index routes such as /app and /demo only match exactly, otherwise they would be active everywhere under them.
 */
export function isActive(pathname: string, href: string, opts: { exact?: boolean } = {}): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (opts.exact || href === "/app" || href === "/demo") return path === href;
  return path === href || path.startsWith(`${href}/`);
}

/** The single nav href that should be highlighted for a path, or undefined. */
export function activeHref(pathname: string, items: NavItem[]): string | undefined {
  return items.find((i) => isActive(pathname, i.href))?.href;
}
