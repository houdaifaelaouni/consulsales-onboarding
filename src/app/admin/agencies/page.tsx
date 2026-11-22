import { NewAgencyForm } from "@/components/admin/new-agency-form";
import { Notice } from "@/components/shell/notice";
import { AGENCY_TIERS } from "@/lib/agency/tiers";
import { createSupabaseAgencyAdminRepo } from "@/lib/agency/supabase-admin-repo";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminAgencies() {
  let rows;
  try {
    rows = await createSupabaseAgencyAdminRepo().list();
  } catch {
    return <Notice icon="error" title={t("dash.error.title")} body={t("dash.error.body")} retryHref="/admin/agencies" retryLabel={t("dash.error.retry")} />;
  }
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{t("agencies.title")}</h1>
        <p className="text-md text-tertiary">{t("agencies.subtitle")}</p>
      </header>
      <NewAgencyForm />
      {rows.length === 0 ? (
        <p role="status" className="text-sm text-tertiary">{t("agencies.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary p-4 ring-1 ring-secondary">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-primary">{a.name}</span>
                <span className="text-sm text-tertiary">{a.ownerEmail ?? "—"}</span>
              </div>
              <span className="text-sm text-secondary">{AGENCY_TIERS[a.tier].title}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
