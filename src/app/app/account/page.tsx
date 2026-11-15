import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/auth/password-form";
import { PinSetup } from "@/components/auth/pin-setup";
import { getViewer } from "@/lib/auth/viewer";
import { t } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  // The PIN lives in a table the browser cannot read, so ask the server. If the server key is missing, say so instead of failing.
  let canSave = true, hasPin = false;
  try {
    const { data, error } = await createAdminClient().rpc("pin_exists", { p_user: viewer.id });
    if (error) canSave = false; else hasPin = data === true;
  } catch { canSave = false; }

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
