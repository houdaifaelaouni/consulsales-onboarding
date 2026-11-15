import { CheckCircle, Globe01, Key01, Lock01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { StatCard } from "@/components/dashboard/stat-card";
import { Frame } from "@/components/shell/frame";
import { INTEGRATIONS, integrationState, summarize, webhookUrl, type EnvStatus, type EnvVar, type IntegrationState } from "@/lib/integrations/config";
import { t } from "@/lib/i18n";
import { CopyButton } from "./copy-button";
import { RecheckButton } from "./recheck-button";

const STATE_COLOR: Record<IntegrationState, "success" | "warning" | "error" | "gray"> = { ready: "success", partial: "warning", missing: "error", optional: "gray" };
const KIND_COLOR: Record<EnvVar["kind"], "brand" | "gray" | "warning"> = { public: "gray", config: "brand", secret: "warning" };

/** Shows which keys the server can see. It only ever receives true/false flags, so it cannot leak a value. */
export function IntegrationsBoard({ status, appUrl, preview = false }: { status: EnvStatus; appUrl?: string; preview?: boolean }) {
  const sum = summarize(status);
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-display-sm font-semibold text-primary">{t("integrations.title")}</h1>
          <p className="max-w-2xl text-md text-tertiary">{t("integrations.subtitle")}</p>
        </div>
        {!preview && <RecheckButton />}
      </header>

      {preview && <p className="rounded-lg bg-secondary p-3 text-sm text-tertiary ring-1 ring-secondary" role="note">{t("integrations.preview")}</p>}

      <section className="grid gap-4 sm:grid-cols-3" aria-label={t("integrations.title")}>
        <StatCard label={t("integrations.stat.ready")} value={`${sum.ready} / ${sum.total}`} progress={{ value: sum.ready, max: sum.total }} />
        <StatCard label={t("integrations.stat.missing")} value={String(sum.requiredMissing)} hint={t("integrations.stat.missingHint")} />
        <StatCard label={t("integrations.stat.where")} value={t("integrations.stat.whereValue")} hint={t("integrations.stat.whereHint")} />
      </section>

      <Frame className="flex flex-col gap-4">
        <h2 className="text-md font-semibold text-primary">{t("integrations.how.title")}</h2>
        <ol className="grid gap-4 text-sm text-tertiary sm:grid-cols-3">
          {([1, 2, 3] as const).map((n) => (
            <li key={n} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-primary ring-1 ring-secondary">{n}</span>
              <span>{t(`integrations.how.${n}` as "integrations.how.1")}</span>
            </li>
          ))}
        </ol>
        <p className="flex items-start gap-2 rounded-lg bg-secondary p-3 text-sm text-secondary"><Lock01 aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-quaternary" />{t("integrations.how.warn")}</p>
      </Frame>

      <ul className="flex flex-col gap-6">
        {INTEGRATIONS.map((i) => {
          const { state, missing } = integrationState(i, status);
          return (
            <li key={i.id}>
              <Frame className="flex flex-col gap-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-primary"><Key01 aria-hidden className="size-5 text-fg-quaternary" />{i.title}</h2>
                    <p className="text-sm text-tertiary">{i.purpose}</p>
                  </div>
                  <Badge size="md" color={STATE_COLOR[state]}>{t(`integrations.state.${state}` as "integrations.state.ready")}</Badge>
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="font-medium text-secondary">{t("integrations.getFrom")}</dt><dd className="mt-0.5 text-tertiary">{i.getItFrom}</dd></div>
                  <div><dt className="font-medium text-secondary">{t("integrations.unlocks")}</dt><dd className="mt-0.5 text-tertiary">{i.unlocks}</dd></div>
                </dl>

                <ul className="divide-y divide-secondary overflow-hidden rounded-lg ring-1 ring-secondary">
                  {i.vars.map((v) => (
                    <li key={v.name} className="flex flex-col gap-2 bg-primary p-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="truncate font-mono text-sm font-medium text-primary">{v.name}</code>
                          <CopyButton text={v.name} />
                        </div>
                        <p className="text-sm text-tertiary">{v.purpose} <span className="text-quaternary">{t("integrations.example", "en", { example: v.example })}</span></p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge size="sm" color={KIND_COLOR[v.kind]}>{t(`integrations.kind.${v.kind}` as "integrations.kind.public")}</Badge>
                        <Badge size="sm" color="gray">{v.required ? t("integrations.required") : t("integrations.optionalVar")}</Badge>
                        {status[v.name] ? (
                          <Badge size="sm" color="success"><span className="flex items-center gap-1"><CheckCircle aria-hidden className="size-3.5" />{t("integrations.set")}</span></Badge>
                        ) : (
                          <Badge size="sm" color={v.required ? "error" : "gray"}>{t("integrations.notSet")}</Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {i.webhookPath && (
                  <div className="flex flex-col gap-1 rounded-lg bg-secondary p-3 text-sm">
                    <p className="flex items-center gap-2 font-medium text-secondary"><Globe01 aria-hidden className="size-4 text-fg-quaternary" />{t("integrations.webhook")}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="break-all font-mono text-sm text-primary">{webhookUrl(appUrl, i.webhookPath)}</code>
                      <CopyButton text={webhookUrl(appUrl, i.webhookPath)} label={t("integrations.copyName")} />
                    </div>
                    <p className="text-tertiary">{t("integrations.webhook.hint")}</p>
                  </div>
                )}
                {state !== "ready" && missing.length > 0 && <p className="text-sm text-tertiary">{t("integrations.missing", "en", { names: missing.join(", ") })}</p>}
              </Frame>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
