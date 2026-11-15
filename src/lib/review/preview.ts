import type { Profile, Version } from "./types";

/** LinkedIn shows roughly three lines before "…see more". */
export const PREVIEW_MAX_LINES = 3;
export const PREVIEW_MAX_CHARS = 210;

export function truncateForPreview(
  text: string, opts: { maxLines?: number; maxChars?: number } = {},
): { visible: string; truncated: boolean } {
  const maxLines = opts.maxLines ?? PREVIEW_MAX_LINES;
  const maxChars = opts.maxChars ?? PREVIEW_MAX_CHARS;
  const lines = text.split("\n");
  let visible = lines.slice(0, maxLines).join("\n");
  let truncated = lines.length > maxLines;
  if (visible.length > maxChars) {
    // Cut on a word boundary so the preview never ends mid-word.
    const cut = visible.slice(0, maxChars);
    visible = cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)).trimEnd();
    truncated = true;
  }
  return { visible, truncated };
}

/** Flat text of a version, so profiles and plain text can be diffed the same way. */
export function versionText(v: Version): string {
  if (!v.profile) return v.content;
  const p: Profile = v.profile;
  return [`Banner: ${p.banner}`, `Headline: ${p.headline}`, "", "About:", ...p.about.split("\n")].join("\n");
}
