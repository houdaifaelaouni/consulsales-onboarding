"use client";

import { useState } from "react";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { AGENCY_TIERS, type AgencyTier } from "@/lib/agency/tiers";
import { BRAND_COLORS } from "@/lib/agency/sample";
import { t } from "@/lib/i18n";
import { cx } from "@/utils/cx";

interface Brand { name: string; color: string }
const TIERS: AgencyTier[] = ["starter", "growth", "scale"];
const MAX_BRANDS = 5;

/** White-label on sample data: your name and colour on the client room (Growth and up), several brands on Scale. */
export function BrandDemo() {
  const [tier, setTier] = useState<AgencyTier>("growth");
  const [brands, setBrands] = useState<Brand[]>([{ name: "North Growth", color: BRAND_COLORS[0] }]);
  const [active, setActive] = useState(0);
  const cfg = AGENCY_TIERS[tier];
  const brand = brands[Math.min(active, brands.length - 1)];

  function patch(p: Partial<Brand>) {
    setBrands(brands.map((b, i) => (i === active ? { ...b, ...p } : b)));
  }
  function addBrand() {
    if (brands.length >= MAX_BRANDS) return;
    setBrands([...brands, { name: t("brand.newName", "en", { n: brands.length + 1 }), color: BRAND_COLORS[brands.length % BRAND_COLORS.length] }]);
    setActive(brands.length);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-sm font-semibold text-primary">{t("brand.title")}</h1>
        <p className="text-md text-tertiary">{t("brand.subtitle")}</p>
      </header>

      <div role="group" aria-label={t("brand.previewAs")} className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-tertiary">{t("brand.previewAs")}</span>
        {TIERS.map((k) => (
          <Button key={k} size="sm" color={k === tier ? "primary" : "secondary"} onPress={() => setTier(k)}>{AGENCY_TIERS[k].title}</Button>
        ))}
      </div>

      {!cfg.whiteLabel ? (
        <section role="status" className="flex flex-col gap-2 rounded-xl bg-secondary p-6 ring-1 ring-secondary">
          <h2 className="text-md font-semibold text-primary">{t("brand.locked.title")}</h2>
          <p className="text-sm text-secondary">{t("brand.locked.body")}</p>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="brand-edit" className="flex flex-col gap-4 rounded-xl bg-primary p-6 ring-1 ring-secondary">
            <h2 id="brand-edit" className="text-md font-semibold text-primary">{t("brand.edit")}</h2>
            {cfg.multiBrand && (
              <div role="group" aria-label={t("brand.brands")} className="flex flex-wrap items-center gap-2">
                {brands.map((b, i) => <Button key={`${b.name}-${i}`} size="sm" color={i === active ? "primary" : "secondary"} onPress={() => setActive(i)}>{b.name}</Button>)}
                <Button size="sm" color="link-gray" isDisabled={brands.length >= MAX_BRANDS} onPress={addBrand}>{t("brand.add")}</Button>
              </div>
            )}
            <Input label={t("brand.name")} value={brand.name} onChange={(v) => patch({ name: v })} />
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-secondary">{t("brand.color")}</legend>
              <div className="flex gap-2">
                {BRAND_COLORS.map((c) => (
                  <button key={c} type="button" aria-label={c} aria-pressed={brand.color === c} onClick={() => patch({ color: c })}
                    className={cx("size-8 rounded-full ring-2 ring-offset-2 ring-offset-primary", brand.color === c ? "ring-brand" : "ring-transparent")} style={{ backgroundColor: c }} />
                ))}
              </div>
            </fieldset>
            <p className="text-sm text-tertiary">{t("brand.logoNote")}</p>
          </section>

          <section aria-labelledby="brand-preview" className="flex flex-col gap-3 rounded-xl bg-primary p-6 ring-1 ring-secondary">
            <div className="flex items-center justify-between gap-2">
              <h2 id="brand-preview" className="text-md font-semibold text-primary">{t("brand.preview")}</h2>
              <Badge size="sm" color="gray">{t("brand.clientSees")}</Badge>
            </div>
            <div className="overflow-hidden rounded-lg ring-1 ring-secondary">
              <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: brand.color }}>
                <span className="flex size-8 items-center justify-center rounded-md bg-white/20 text-sm font-semibold">{brand.name.trim().charAt(0).toUpperCase() || "?"}</span>
                <span className="text-sm font-semibold">{brand.name.trim() || t("brand.untitled")}</span>
              </div>
              <div className="flex flex-col gap-2 p-4">
                <p className="text-sm font-semibold text-primary">{t("brand.welcome", "en", { name: "Sara" })}</p>
                <p className="text-sm text-tertiary">{t("brand.welcomeBody")}</p>
                <span className="w-fit rounded-md px-3 py-1.5 text-sm font-semibold text-white" style={{ backgroundColor: brand.color }}>{t("brand.cta")}</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
