"use client";

import { useEffect, useRef } from "react";
import { createAnchor, segmentText } from "@/lib/review/comments";
import type { Anchor } from "@/lib/review/types";
import { cx } from "@/utils/cx";

export function CommentableText({
  text, anchors, activeId, disabled, onSelect, onPick,
}: {
  text: string;
  anchors: Array<{ id: string; anchor: Anchor; resolved: boolean }>;
  activeId: string | null;
  disabled: boolean;
  onSelect: (a: Anchor | null) => void;
  onPick: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Track the selection inside this block; offsets are measured against the rendered text.
  useEffect(() => {
    if (disabled) return;
    function onChange() {
      const sel = document.getSelection();
      const root = ref.current;
      if (!sel || !root || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;
      const pre = document.createRange();
      pre.selectNodeContents(root);
      pre.setEnd(range.startContainer, range.startOffset);
      const start = pre.toString().length;
      onSelect(createAnchor(text, start, start + range.toString().length));
    }
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, [text, disabled, onSelect]);

  const segs = segmentText(text, anchors);
  const byId = new Map(anchors.map((a) => [a.id, a]));
  return (
    <div ref={ref} className="rounded-xl bg-primary p-5 leading-7 whitespace-pre-wrap text-secondary shadow-xs ring-1 ring-secondary selection:bg-brand-500/40 selection:text-primary">
      {segs.map((s, i) =>
        s.threadId ? (
          <mark
            key={i} id={`mark-${s.threadId}`} role="button" tabIndex={0} onClick={() => onPick(s.threadId!)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(s.threadId!); } }}
            className={cx(
              "cursor-pointer rounded-sm bg-secondary px-0.5 text-primary underline decoration-2 underline-offset-4 outline-focus-ring focus-visible:outline-2",
              byId.get(s.threadId)?.resolved ? "decoration-gray-700" : "decoration-gray-500",
              activeId === s.threadId && "decoration-brand-500",
            )}
          >
            {s.text}
          </mark>
        ) : <span key={i}>{s.text}</span>,
      )}
    </div>
  );
}
