import Image from "next/image";
import { cx } from "@/utils/cx";

/**
 * The ConsulSales logo. White version on the dark theme, black version on the light theme.
 * Files live in public/brand/. This is the only place the logo is placed, so a change here updates every screen.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex shrink-0", className)}>
      <Image src="/brand/consulsales-logo-black.svg" alt="ConsulSales" width={175} height={65} unoptimized priority className="h-9 w-auto dark:hidden" />
      <Image src="/brand/consulsales-logo-white.svg" alt="ConsulSales" width={175} height={65} unoptimized priority className="hidden h-9 w-auto dark:block" />
    </span>
  );
}
