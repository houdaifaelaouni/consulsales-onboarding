import { AlertCircle } from "@untitledui/icons";
import { BadgeWithIcon } from "@/components/base/badges/badges";
import { t } from "@/lib/i18n";
import type { Flag } from "@/lib/admin/types";

/** Red marks a blocker. The icon and the text carry the meaning too, so colour is never the only signal. */
export function FlagBadge({ flag }: { flag: Flag }) {
  return (
    <BadgeWithIcon size="sm" color="error" iconLeading={AlertCircle}>
      {t(`admin.flag.${flag.kind}` as "admin.flag.task_overdue", "en", { n: flag.amount })}
    </BadgeWithIcon>
  );
}
