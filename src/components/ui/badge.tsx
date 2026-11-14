import { cn } from "@/lib/cn";

export function Badge({
  tone = "neutral", className, ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs",
        tone === "success" ? "text-success" : "text-ink-muted", className,
      )}
      {...props}
    />
  );
}
