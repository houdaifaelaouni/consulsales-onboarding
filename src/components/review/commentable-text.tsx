"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { createAnchor, segmentText } from "@/lib/review/comments";
import type { Anchor } from "@/lib/review/types";

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
    <div ref={ref} className="whitespace-pre-wrap rounded-lg border border-hairline bg-surface-1 p-4 leading-7 text-ink-muted selection:bg-primary/40 selection:text-ink">
      {segs.map((s, i) =>
        s.threadId ? (
          <mark
            key={i} id={`mark-${s.threadId}`} role="button" tabIndex={0} onClick={() => onPick(s.threadId!)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(s.threadId!); } }}
            className={cn("cursor-pointer rounded-sm bg-surface-3 px-0.5 text-ink underline decoration-2 underline-offset-4",
              byId.get(s.threadId)?.resolved ? "decoration-hairline-strong" : "decoration-ink-subtle",
              activeId === s.threadId && "decoration-primary")}
          >
            {s.text}
          </mark>
        ) : <span key={i}>{s.text}</span>,
      )}
    </div>
  );
}
