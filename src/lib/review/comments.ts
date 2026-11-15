import type { Anchor } from "./types";

export const MAX_QUOTE_CHARS = 500;

/** Builds an anchor from a selection, trimming stray whitespace. Returns null if nothing useful is selected. */
export function createAnchor(text: string, start: number, end: number): Anchor | null {
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  let s = Math.max(0, Math.min(start, end));
  let e = Math.min(text.length, Math.max(start, end));
  while (s < e && /\s/.test(text[s])) s++;
  while (e > s && /\s/.test(text[e - 1])) e--;
  if (e - s === 0 || e - s > MAX_QUOTE_CHARS) return null;
  return { start: s, end: e, quote: text.slice(s, e) };
}

/**
 * Re-anchors a comment on new text. Keeps the position if the quote is unchanged, otherwise moves to the
 * closest occurrence of the quote, otherwise returns null (the quoted text no longer exists).
 */
export function reanchor(text: string, anchor: Anchor): Anchor | null {
  if (text.slice(anchor.start, anchor.end) === anchor.quote) return anchor;
  let best: number | null = null;
  for (let i = text.indexOf(anchor.quote); i !== -1; i = text.indexOf(anchor.quote, i + 1)) {
    if (best === null || Math.abs(i - anchor.start) < Math.abs(best - anchor.start)) best = i;
  }
  return best === null ? null : { start: best, end: best + anchor.quote.length, quote: anchor.quote };
}

export interface Segment { text: string; threadId: string | null }

/** Splits text into plain and highlighted segments. Overlapping anchors: the earlier one wins. */
export function segmentText(text: string, anchors: Array<{ id: string; anchor: Anchor }>): Segment[] {
  const sorted = [...anchors].sort((a, b) => a.anchor.start - b.anchor.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const { id, anchor } of sorted) {
    if (anchor.start < pos || anchor.end > text.length) continue;
    if (anchor.start > pos) out.push({ text: text.slice(pos, anchor.start), threadId: null });
    out.push({ text: text.slice(anchor.start, anchor.end), threadId: id });
    pos = anchor.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), threadId: null });
  return out;
}
