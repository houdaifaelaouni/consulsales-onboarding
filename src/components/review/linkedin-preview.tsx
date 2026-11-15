"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import { truncateForPreview } from "@/lib/review/preview";
import type { Profile } from "@/lib/review/types";
import { cx } from "@/utils/cx";

/** Neutral, LinkedIn-style card. It is a preview of layout and truncation, not LinkedIn's own artwork. */
function SeeMore({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const { visible, truncated } = truncateForPreview(text);
  return (
    <div className={cx("whitespace-pre-wrap", className)}>
      {open || !truncated ? text : visible}
      {truncated && (
        <button type="button" className="ml-1 text-quaternary hover:text-primary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? t("review.seeLess") : t("review.seeMore")}
        </button>
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-tertiary text-lg font-medium text-primary ring-1 ring-secondary">{initials}</span>;
}

export function ProfilePreview({ profile, label }: { profile: Profile; label: string }) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-semibold text-tertiary">{label}</figcaption>
      <div className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
        <div className="grid h-20 place-items-center bg-tertiary px-3 text-center text-sm text-secondary">{profile.banner}</div>
        <div className="flex flex-col gap-3 p-4">
          <div className="-mt-12 w-fit rounded-full ring-2 ring-primary"><Avatar name={profile.name} /></div>
          <div>
            <p className="text-lg font-semibold text-primary">{profile.name}</p>
            <p className="text-secondary">{profile.headline}</p>
          </div>
          <div className="flex flex-col gap-1 border-t border-secondary pt-3">
            <p className="text-sm font-medium text-primary">About</p>
            <SeeMore text={profile.about} className="text-sm text-tertiary" />
          </div>
        </div>
      </div>
    </figure>
  );
}

export function PostPreview({ author, headline, text }: { author: string; headline: string; text: string }) {
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
        <div className="flex items-center gap-3">
          <Avatar name={author} />
          <div className="min-w-0"><p className="font-semibold text-primary">{author}</p><p className="truncate text-sm text-quaternary">{headline}</p></div>
        </div>
        <SeeMore text={text} className="text-secondary" />
      </div>
    </figure>
  );
}
