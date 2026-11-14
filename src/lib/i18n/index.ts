import en from "./en.json";

export type Locale = "en" | "fr" | "es" | "de" | "pt-br" | "zh";
type Dict = typeof en;
export type MessageKey = keyof Dict;

const dictionaries: Partial<Record<Locale, Dict>> = { en };

/** All UI strings go through t(). Missing translations fall back to English. */
export function t(key: MessageKey, locale: Locale = "en"): string {
  return (dictionaries[locale] ?? en)[key] ?? en[key];
}
