import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/auth/password-form";
import { PinSetup } from "@/components/auth/pin-setup";
import { getViewer } from "@/lib/auth/viewer";
import { t } from "@/lib/i18n";
import { pinStatus } from "@/lib/auth/pin-status";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const pin = await pinStatus(viewer.id);
  const canSave = pin !== "unavailable", hasPin = pin === "on";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{t("account.title")}</h1>
        <p className="text-md text-tertiary">{t("account.subtitle", "en", { email: viewer.email })}</p>
      </header>
      <section className="flex flex-col gap-4 rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
        <div className="flex flex-col gap-1">
          <h2 className="text-md font-semibold text-primary">{t("account.password.title")}</h2>
          <p className="text-sm text-tertiary">{t("account.password.body")}</p>
        </div>
        <PasswordForm email={viewer.email} />
      </section>
      <section className="flex flex-col gap-4 rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
        <div className="flex flex-col gap-1">
          <h2 className="text-md font-semibold text-primary">{t("pin.title")}</h2>
          <p className="text-sm text-tertiary">{t("pin.body")}</p>
        </div>
        <PinSetup hasPin={hasPin} canSave={canSave} />
      </section>
    </main>
  );
}
