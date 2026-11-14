import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
const variants: Record<Variant, string> = {
  // Accent lives on the primary CTA and the focus ring only.
  primary: "bg-primary text-white hover:bg-primary-hover active:bg-primary-focus",
  secondary: "bg-surface-1 text-ink border border-hairline hover:bg-surface-2",
  ghost: "bg-transparent text-ink hover:bg-surface-1",
};

export function Button({
  variant = "primary", className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant], className,
      )}
      {...props}
    />
  );
}
