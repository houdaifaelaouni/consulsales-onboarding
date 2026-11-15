import { t } from "@/lib/i18n";
import type { Flag } from "@/lib/admin/types";

/** Red marks a blocker. The "!" and the text carry the meaning too, so colour is never the only signal. */
export function FlagBadge({ flag }: { flag: Flag }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/50 bg-danger/10 px-2 py-0.5 text-xs text-danger">
      <span aria-hidden className="font-bold">!</span>
      {t(`admin.flag.${flag.kind}` as "admin.flag.task_overdue", "en", { n: flag.amount })}
    </span>
  );
}
