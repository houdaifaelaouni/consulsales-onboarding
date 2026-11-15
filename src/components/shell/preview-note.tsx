import { t } from "@/lib/i18n";

/** Honest label for screens that still run on sample data. Remove it when the screen reads the database. */
export function PreviewNote() {
  return <p className="border-b border-secondary bg-secondary px-4 py-2 text-center text-xs text-tertiary">{t("preview.note")}</p>;
}
