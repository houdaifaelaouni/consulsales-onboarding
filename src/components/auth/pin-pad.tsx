"use client";

import { useEffect, useRef } from "react";
import { Delete } from "@untitledui/icons";
import { PIN_LENGTH, pushDigit } from "@/lib/auth/pin";
import { t } from "@/lib/i18n";
import { cx } from "@/utils/cx";

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Called once when the sixth digit is entered. */
  onComplete?: (v: string) => void;
  disabled?: boolean;
  isInvalid?: boolean;
  /** Describes what the digits are for, read out to screen readers. */
  label: string;
}

const ROWS: string[][] = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]];

/** A six-digit keypad: dots show progress, the digits are never displayed. Works with touch, mouse and the number keys. */
export function PinPad({ value, onChange, onComplete, disabled, isInvalid, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef("");

  const press = (key: string) => {
    if (disabled) return;
    const next = pushDigit(value, key);
    if (next === value) return;
    onChange(next);
    if (next.length === PIN_LENGTH && last.current !== next) { last.current = next; onComplete?.(next); }
  };
  const back = () => { if (!disabled && value) { last.current = ""; onChange(value.slice(0, -1)); } };
  const clear = () => { if (!disabled) { last.current = ""; onChange(""); } };

  // A fresh start after a wrong PIN lets the same digits be tried again.
  useEffect(() => { if (value === "") last.current = ""; }, [value]);

  return (
    <div
      ref={ref} role="group" aria-label={label} tabIndex={0}
      onKeyDown={(e) => {
        if (/^\d$/.test(e.key)) { e.preventDefault(); press(e.key); }
        else if (e.key === "Backspace") { e.preventDefault(); back(); }
        else if (e.key === "Escape") { e.preventDefault(); clear(); }
      }}
      className="flex w-full max-w-xs flex-col items-center gap-6 rounded-xl outline-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
    >
      <div className="flex items-center gap-3" role="img" aria-label={t("pin.progress", "en", { n: value.length, total: PIN_LENGTH })}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i} aria-hidden
            className={cx("size-3.5 rounded-full ring-1 transition", i < value.length ? "bg-brand-solid ring-brand" : "bg-transparent ring-primary", isInvalid && "ring-error_subtle", isInvalid && i < value.length && "bg-error-solid")}
          />
        ))}
      </div>

      <div className="grid w-full grid-cols-3 overflow-hidden rounded-xl bg-secondary ring-1 ring-primary">
        {ROWS.flat().map((k) => <Key key={k} onPress={() => press(k)} disabled={disabled}>{k}</Key>)}
        <Key onPress={clear} disabled={disabled || !value} small>{t("pin.clear")}</Key>
        <Key onPress={() => press("0")} disabled={disabled}>0</Key>
        <Key onPress={back} disabled={disabled || !value} aria-label={t("pin.backspace")}><Delete aria-hidden className="mx-auto size-6" /></Key>
      </div>
    </div>
  );
}

function Key({ children, onPress, disabled, small, ...rest }: { children: React.ReactNode; onPress: () => void; disabled?: boolean; small?: boolean; "aria-label"?: string }) {
  return (
    <button
      type="button" tabIndex={-1} onClick={onPress} disabled={disabled} {...rest}
      className={cx(
        "h-16 border-b border-r border-secondary text-primary transition [&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+3)]:border-b-0 hover:bg-primary_hover active:bg-primary disabled:opacity-40",
        small ? "text-md font-medium" : "text-display-xs font-medium",
      )}
    >
      {children}
    </button>
  );
}
