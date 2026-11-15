import { cn } from "@/lib/cn";

/**
 * Brand mark. TEXT PLACEHOLDER until the official files are in the repo:
 * drop the white SVGs into public/brand/ and replace the body of this component with <img> tags.
 * Every screen uses this one component, so that is the only change needed.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="ConsulSales" className={cn("inline-flex items-baseline leading-none text-ink", className)}>
      <span aria-hidden className="font-serif text-xl tracking-[-0.4px]">Consul</span>
      <span aria-hidden className="text-xl font-bold tracking-[-0.6px]">Sales.</span>
    </span>
  );
}
