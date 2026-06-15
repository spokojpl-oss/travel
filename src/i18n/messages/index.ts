import type { Locale } from "@/i18n/config";
import { en } from "@/i18n/messages/en";
import { pl, type Messages } from "@/i18n/messages/pl";

const catalogs: Record<Locale, Messages> = { pl, en };

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}

export type { Messages };
