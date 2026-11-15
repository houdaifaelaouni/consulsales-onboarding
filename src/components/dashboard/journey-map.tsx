import { Check } from "@untitledui/icons";
import { STAGES, stageStates, type HomeTask, type Stage } from "@/lib/home";
import { t } from "@/lib/i18n";

const DAYS: Record<Stage, string> = { 1: "1–10", 2: "11–20", 3: "21–30" };

/** The 30-day path in three steps, with what the client does and what they pay at each. */
export function JourneyMap({ tasks }: { tasks: HomeTask[] }) {
  const states = stageStates(tasks);
  return (
    <section aria-label={t("journey.title")} className="flex flex-col gap-4 rounded-xl bg-primary p-6 ring-1 ring-secondary">
      <h2 className="text-md font-semibold text-primary">{t("journey.title")}</h2>
      <ol className="grid gap-4 md:grid-cols-3">
        {STAGES.map((s) => {
          const st = states[s];
          return (
            <li key={s} aria-current={st === "current" ? "step" : undefined}
              className={`flex flex-col gap-2 rounded-lg p-4 ring-1 ${st === "current" ? "bg-brand-primary ring-brand" : "bg-secondary ring-secondary"}`}>
              <div className="flex items-center gap-2">
                <span className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${st === "done" ? "bg-brand-solid text-white" : "bg-tertiary text-secondary"}`}>
                  {st === "done" ? <Check className="size-4" aria-hidden="true" /> : s}
                </span>
                <span className="text-sm font-semibold text-primary">{t(`journey.stage.${s}.name` as "journey.stage.1.name")}</span>
                <span className="ml-auto text-xs text-tertiary">{t("journey.days", "en", { range: DAYS[s] })}</span>
              </div>
              <p className="text-sm text-tertiary">{t(`journey.stage.${s}.body` as "journey.stage.1.body")}</p>
              <p className="text-xs font-medium text-secondary">{t(`journey.stage.${s}.pay` as "journey.stage.1.pay")}</p>
              <p className="sr-only">{t(`journey.state.${st}` as "journey.state.done")}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
