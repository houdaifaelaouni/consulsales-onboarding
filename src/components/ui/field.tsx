import { cn } from "@/lib/cn";

const base =
  "w-full rounded-md border border-hairline bg-surface-1 px-3 py-2 text-ink placeholder:text-ink-subtle focus-visible:border-primary disabled:opacity-50 aria-[invalid=true]:border-hairline-strong";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...props} />;
}
export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-24", className)} {...props} />;
}
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, className)} {...props} />;
}
