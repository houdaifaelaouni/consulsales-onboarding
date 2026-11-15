import en from "./en.json";

export type Locale = "en" | "fr" | "es" | "de" | "pt-br" | "zh";
type Dict = typeof en;
export type MessageKey = keyof Dict;

const dictionaries: Partial<Record<Locale, Dict>> = { en };

/** All UI strings go through t(). Missing translations fall back to English. {vars} are interpolated. */
export function t(key: MessageKey, locale: Locale = "en", vars?: Record<string, string | number>): string {
  const raw = (dictionaries[locale] ?? en)[key] ?? en[key];
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : raw;
}

/** Looks up a key built at runtime (e.g. task.<type>); returns the fallback if it does not exist. */
export function tDynamic(key: string, locale: Locale = "en", fallback = key): string {
  return key in en ? t(key as MessageKey, locale) : fallback;
}
