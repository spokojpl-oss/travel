export const LOCALES = ["pl", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pl";
export const LOCALE_COOKIE = "travel_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "pl" || value === "en";
}

export function localeToIntl(locale: Locale): string {
  return locale === "en" ? "en-GB" : "pl-PL";
}
