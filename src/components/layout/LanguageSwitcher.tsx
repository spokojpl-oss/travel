"use client";

import { cn } from "@/lib/utils/cn";
import { useLocale } from "@/i18n/locale-provider";
import type { Locale } from "@/i18n/config";

const OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "pl", label: "PL" },
  { value: "en", label: "EN" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, switching } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-white/15 bg-white/5 p-0.5",
        switching && "opacity-70",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {OPTIONS.map((option) => {
        const active = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={switching}
            onClick={() => setLocale(option.value)}
            className={cn(
              "min-w-[2.25rem] rounded-md px-2 py-1 text-xs font-bold tracking-wide transition-colors",
              active
                ? "bg-white text-brand-900 shadow-sm"
                : "text-white/65 hover:bg-white/10 hover:text-white",
            )}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
