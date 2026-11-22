"use client";

import { useState } from "react";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { DEMO_ANGLES, DEMO_ICP, DEMO_INPUTS, DEMO_PACKS, VERIFY_BELOW, type DemoInput } from "@/lib/agency/sample";
import { t } from "@/lib/i18n";

const INPUT_KEY = {
  icpNotes: "icp.in.icpNotes", transcript: "icp.in.transcript", leadList: "icp.in.leadList", caseStudies: "icp.in.caseStudies", proposal: "icp.in.proposal", website: "icp.in.website",
} as const;
const FIELD_KEY = {
  industries: "icp.f.industries", sizes: "icp.f.sizes", titles: "icp.f.titles", geos: "icp.f.geos", exclusions: "icp.f.exclusions", triggers: "icp.f.triggers", disqualifiers: "icp.f.disqualifiers",
} as const;
const ANGLE_KEY = { a1: "icp.angle.a1", a2: "icp.angle.a2", a3: "icp.angle.a3" } as const;
const PACK_KEY = { small: "icp.pack.small", medium: "icp.pack.medium", large: "icp.pack.large" } as const;

/** AI ICP extraction on sample data: pick the client's documents, run one extraction (one credit), review fields with confidence. */
export function IcpDemo() {
  const [picked, setPicked] = useState<DemoInput[]>(["icpNotes", "transcript"]);
  const [credits, setCredits] = useState(3);
  const [result, setResult] = useState(false);
  const [empty, setEmpty] = useState(false);

  function toggle(k: DemoInput) {
    setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  }
  function run() {
    if (credits < 1 || picked.length === 0) return;
    setCredits(credits - 1); setResult(true); setEmpty(false);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{t("icp.title")}</h1>
        <p className="text-md text-tertiary">{t("icp.subtitle")}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2" aria-label={t("icp.credits")}>
        <StatCard label={t("icp.credits")} value={String(credits)} hint={t("icp.creditsHint")} />
        <StatCard label={t("icp.selected")} value={`${picked.length} / ${DEMO_INPUTS.length}`} progress={{ value: picked.length, max: DEMO_INPUTS.length }} />
      </section>

      <section aria-labelledby="icp-inputs" className="flex flex-col gap-3 rounded-xl bg-primary p-6 ring-1 ring-secondary">
        <h2 id="icp-inputs" className="text-md font-semibold text-primary">{t("icp.inputs")}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {DEMO_INPUTS.map((k) => (
            <li key={k}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-secondary p-3 text-sm text-secondary ring-1 ring-secondary">
                <input type="checkbox" checked={picked.includes(k)} onChange={() => toggle(k)} className="size-4" />
                {t(INPUT_KEY[k])}
              </label>
            </li>
          ))}
        </ul>
        {credits < 1 && <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary">{t("icp.noCredits")}</p>}
        {empty && <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">{t("icp.nothing")}</p>}
        <div><Button isDisabled={credits < 1} onPress={() => (picked.length === 0 ? setEmpty(true) : run())}>{t("icp.run")}</Button></div>
      </section>

      {result && (
        <>
          <section aria-labelledby="icp-result" className="flex flex-col gap-3">
            <h2 id="icp-result" className="text-lg font-semibold text-primary">{t("icp.result")}</h2>
            <ul className="flex flex-col gap-3">
              {DEMO_ICP.map((f) => (
                <li key={f.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary p-4 ring-1 ring-secondary">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-primary">{t(FIELD_KEY[f.key])}</span>
                    <span className="text-sm text-secondary">{f.value}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-tertiary">{t("icp.confidence", "en", { n: f.confidence })}</span>
                    {f.confidence < VERIFY_BELOW && <Badge size="sm" color="warning">{t("icp.verify")}</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="icp-angles" className="flex flex-col gap-3 rounded-xl bg-primary p-6 ring-1 ring-secondary">
            <h2 id="icp-angles" className="text-md font-semibold text-primary">{t("icp.angles")}</h2>
            <p className="text-sm text-tertiary">{t("icp.anglesNote")}</p>
            <ul className="flex flex-col gap-2 text-sm text-secondary">
              {DEMO_ANGLES.map((a) => <li key={a} className="rounded-lg bg-secondary p-3">{t(ANGLE_KEY[a])}</li>)}
            </ul>
          </section>
        </>
      )}

      <section aria-labelledby="icp-packs" className="flex flex-col gap-3">
        <h2 id="icp-packs" className="text-lg font-semibold text-primary">{t("icp.packs")}</h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {DEMO_PACKS.map((p) => (
            <li key={p.key} className="flex flex-col gap-3 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary">
              <h3 className="text-md font-semibold text-primary">{t(PACK_KEY[p.key])}</h3>
              <p className="text-display-xs font-semibold text-primary">€{p.price}</p>
              <p className="text-sm text-secondary">{t("icp.packCredits", "en", { n: p.credits })}</p>
              <Button color="secondary" onPress={() => setCredits(credits + p.credits)}>{t("icp.buy")}</Button>
            </li>
          ))}
        </ul>
        <p className="text-sm text-tertiary">{t("icp.demoPay")}</p>
      </section>
    </main>
  );
}
