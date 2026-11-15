import { cx } from "@/utils/cx";

/** A framed panel with small corner marks: the visual anchor used for step panels and setup cards. */
export function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("relative rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary sm:p-6", className)}>
      {["-top-2 -left-2", "-top-2 -right-2", "-bottom-2 -left-2", "-bottom-2 -right-2"].map((pos) => (
        <span key={pos} aria-hidden className={cx("absolute z-0 hidden size-4 items-center justify-center text-base leading-none text-quaternary sm:flex", pos)}>+</span>
      ))}
      {children}
    </div>
  );
}
