"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { createTranslator, type Translator } from "@/i18n/translator";

type LocaleContextValue = {
  locale: Locale;
  messages: Messages;
  t: Translator;
  setLocale: (locale: Locale) => void;
  switching: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const router = useRouter();
  const [switching, startTransition] = useTransition();

  const t = useMemo(() => createTranslator(messages), [messages]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      startTransition(async () => {
        await fetch("/api/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: next }),
        });
        router.refresh();
      });
    },
    [locale, router],
  );

  const value = useMemo(
    () => ({ locale, messages, t, setLocale, switching }),
    [locale, messages, t, setLocale, switching],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

export function useT() {
  return useLocale().t;
}
