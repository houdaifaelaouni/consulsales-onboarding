"use client";

import { useState } from "react";
import { Plus, XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { t } from "@/lib/i18n";
import type { StepInput } from "@/lib/outreach/campaign";
import { simulateRun, TEST_LEAD, type TestTurn } from "@/lib/outreach/testrun";
import { cx } from "@/utils/cx";

interface Run { id: number; turns: TestTurn[] }

/**
 * Test Mode simulates the sequence on the real copy with a made-up prospect. It is deterministic and local: nothing is
 * sent to LinkedIn, no agent is called and nothing is stored, which the banner says in plain words.
 */
export function TestMode({ steps }: { steps: StepInput[] }) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [nextId, setNextId] = useState(1);

  function startRun() {
    setRuns((r) => [...r, { id: nextId, turns: simulateRun(steps, TEST_LEAD, t("outreach.test.reply")) }]);
    setNextId((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-primary">{t("outreach.test.title")}</h2>
          <p className="text-sm text-tertiary">{t("outreach.test.subtitle")}</p>
        </div>
        <Button size="sm" iconLeading={Plus} onPress={startRun}>{t("outreach.test.new")}</Button>
      </section>
      <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-tertiary">{t("outreach.test.simulated")}</p>

      {runs.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-secondary bg-primary px-6 py-16 text-center">
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-secondary text-tertiary">💬</span>
          <h3 className="text-md font-semibold text-primary">{t("outreach.test.none")}</h3>
          <p className="max-w-sm text-sm text-tertiary">{t("outreach.test.noneBody")}</p>
          <Button color="secondary" onPress={startRun}>{t("outreach.test.first")}</Button>
        </section>
      ) : (
        <ul className="flex flex-col gap-4">
          {runs.map((run) => (
            <li key={run.id} className="flex flex-col gap-4 rounded-2xl border border-secondary bg-primary p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-primary">{t("outreach.test.run", "en", { n: run.id })}</h3>
                <Button size="sm" color="link-gray" iconLeading={XClose} onPress={() => setRuns((r) => r.filter((x) => x.id !== run.id))}>
                  {t("outreach.test.close")}
                </Button>
              </div>
              <ol className="flex flex-col gap-2">
                {run.turns.map((turn, i) => (
                  <li key={i} className={cx("flex flex-col gap-1 rounded-xl p-3 text-sm", turn.role === "agent" ? "bg-secondary" : "bg-brand-secondary")}>
                    <span className="text-xs font-medium text-tertiary">{t(turn.role === "agent" ? "outreach.test.agent" : "outreach.test.lead")}</span>
                    <span className="text-primary">{turn.text}</span>
                  </li>
                ))}
              </ol>
              <div className="flex flex-col gap-1">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-tertiary">{t("outreach.test.log")}</h4>
                <ul className="flex flex-col gap-1 text-xs text-secondary">
                  <li>· {t("outreach.test.logInvite", "en", { n: steps[0]?.body.length ?? 0 })}</li>
                  <li>· {t("outreach.test.logMessage", "en", { n: 1 })}</li>
                  <li>· {t("outreach.test.logReply")}</li>
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
