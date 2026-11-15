import { cn } from "@/lib/cn";

export function Toast({
  tone = "neutral", className, ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: "neutral" | "success" }) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border border-hairline-strong bg-surface-3 px-4 py-3 text-sm text-ink",
        tone === "success" && "border-l-2 border-l-success", className,
      )}
      {...props}
    />
  );
}
