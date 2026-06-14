"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function HeroSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<"activities" | "destination">("activities");

  return (
    <section
      className={cn(
        "relative overflow-hidden bg-brand-900",
        compact ? "pt-8 pb-12" : "pt-16 pb-24 lg:pt-24 lg:pb-32",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        className="absolute top-0 right-0 h-full w-1/2 opacity-30"
        style={{
          background:
            "radial-gradient(circle at top right, #ff5b0040, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        {!compact && (
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-success" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span>
                Planuj wakacje <strong className="text-white">od aktywności</strong>
              </span>
            </div>
          </div>
        )}

        <div
          className={cn(
            "mx-auto mb-10 max-w-4xl text-center text-white",
            compact && "mb-8",
          )}
        >
          <h1
            className={cn(
              "font-display font-bold tracking-tight leading-[1.05]",
              compact ? "text-3xl md:text-4xl" : "text-4xl md:text-5xl lg:text-6xl",
            )}
          >
            Zaplanuj wakacje
            <br />
            <span className="text-accent-500">dopasowane do rodziny</span>
          </h1>
          {!compact && (
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
              Powiedz nam co lubicie robić — znajdziemy regiony świata, gdzie
              wszystkie atrakcje są blisko siebie. Lot, hotel, auto i plan dzień
              po dniu.
            </p>
          )}
        </div>

        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-2 shadow-hero">
          <div className="flex gap-1 border-b border-border-default px-4 pt-3">
            <TabButton
              active={tab === "activities"}
              onClick={() => setTab("activities")}
              label="Od aktywności"
              icon="🎯"
            />
            <TabButton
              active={tab === "destination"}
              onClick={() => setTab("destination")}
              label="Od destynacji"
              icon="📍"
            />
          </div>

          <div className="p-3 md:p-4">
            <SearchField
              label={tab === "activities" ? "Co chcecie robić?" : "Dokąd?"}
              placeholder={
                tab === "activities"
                  ? "np. quady, rowery, jaskinie"
                  : "Madera, Mallorca, Kreta..."
              }
              icon="🎯"
              large
            />

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <SearchField label="Kiedy?" placeholder="Sierpień 2026" icon="📅" />
              <SearchField label="Skąd?" placeholder="Warszawa" icon="✈️" />
              <SearchField label="Ile osób?" placeholder="2 dorosłych" icon="👥" />
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  tab === "activities" ? "/app/search" : "/app/search",
                )
              }
              className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent-500 px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-accent-600 hover:shadow-lg active:scale-[0.99]"
            >
              🔍 Szukaj wakacji
            </button>

            <div className="mt-4 flex flex-wrap gap-2 px-1">
              <QuickFilter>Z dziećmi</QuickFilter>
              <QuickFilter>Aktywne</QuickFilter>
              <QuickFilter>Pod 5000 zł</QuickFilter>
              <QuickFilter>Bez przesiadek</QuickFilter>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-white/70">
            <span>✓ Bez ukrytych kosztów</span>
            <span>✓ Bezpośrednie linki do partnerów</span>
            <span>✓ Inteligentne porady przed wyjazdem</span>
          </div>
        )}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "border-accent-500 text-text-primary"
          : "border-transparent text-text-secondary hover:text-text-primary",
      )}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

function SearchField({
  label,
  placeholder,
  icon,
  large,
}: {
  label: string;
  placeholder: string;
  icon: string;
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "cursor-pointer rounded-xl border transition-all hover:border-brand-300",
        large
          ? "border-2 border-border-default p-4 focus-within:border-brand-700 focus-within:ring-4 focus-within:ring-brand-100"
          : "border-border-default p-3",
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <input
        type="text"
        placeholder={placeholder}
        className={cn(
          "w-full border-0 bg-transparent p-0 font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-0",
          large ? "text-lg font-semibold" : "text-base",
        )}
      />
    </div>
  );
}

function QuickFilter({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="rounded-full bg-bg-soft px-3 py-1 text-sm font-medium text-text-secondary transition-colors hover:bg-brand-50 hover:text-brand-700"
    >
      {children}
    </button>
  );
}
