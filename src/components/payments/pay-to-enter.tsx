import { Art } from "@/components/illustrations/art";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";

/** Shown instead of the workspace until stage 1 is paid. No payment, no workspace. */
export function PayToEnter({ amount, payUrl }: { amount: string; payUrl: string | null }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Art kind="payment" className="h-36 w-auto" />
      <h1 className="text-display-xs font-semibold text-primary">{t("entry.title")}</h1>
      <p className="text-md text-tertiary">{t("entry.body", "en", { amount })}</p>
      {payUrl ? (
        <Button size="lg" href={payUrl}>{t("entry.cta", "en", { amount })}</Button>
      ) : (
        <p role="status" className="text-sm text-tertiary">{t("entry.unavailable")}</p>
      )}
      <p className="text-sm text-tertiary">{t("entry.confirming")}</p>
      <Button color="secondary" href="/app">{t("entry.refresh")}</Button>
    </main>
  );
}
