"use client";

import { useEffect, useRef } from "react";

export function Dialog({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref} onClose={onClose} aria-labelledby="dialog-title"
      className="m-auto w-[min(92vw,28rem)] rounded-lg border border-hairline-strong bg-surface-2 p-6 text-ink backdrop:bg-black/70"
    >
      <h2 id="dialog-title" className="mb-3 text-[22px] font-medium tracking-[-0.4px]">{title}</h2>
      {children}
    </dialog>
  );
}
