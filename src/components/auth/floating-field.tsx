"use client";

import { useId } from "react";
import { cx } from "@/utils/cx";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "email" | "text";
  autoComplete?: string;
  isInvalid?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
}

/** An input whose label sits inside the field and floats up once there is text or focus. */
export function FloatingField({ label, value, onChange, type = "text", autoComplete, isInvalid, describedBy, autoFocus }: Props) {
  const id = useId();
  return (
    <div className={cx(
      "relative rounded-xl bg-secondary ring-1 ring-primary transition focus-within:bg-primary focus-within:ring-2 focus-within:ring-brand",
      isInvalid && "ring-error_subtle focus-within:ring-error",
    )}>
      <input
        id={id} type={type} value={value} autoComplete={autoComplete} autoFocus={autoFocus} required
        aria-invalid={isInvalid || undefined} aria-describedby={describedBy}
        placeholder=" " onChange={(e) => onChange(e.target.value)}
        className="peer block h-16 w-full rounded-xl bg-transparent px-4 pt-6 pb-2 text-md text-primary outline-hidden placeholder:text-transparent"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-md text-tertiary transition-all peer-focus:top-4 peer-focus:text-xs peer-not-placeholder-shown:top-4 peer-not-placeholder-shown:text-xs"
      >
        {label}
      </label>
    </div>
  );
}
