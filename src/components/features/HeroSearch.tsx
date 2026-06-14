"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/Icon";
import { TripSearchForm } from "@/components/features/TripSearchForm";
import {
  defaultTripContext,
  tripContextToParams,
  type TripContext,
} from "@/lib/search/trip-context";

export function HeroSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [trip, setTrip] = useState<TripContext>(defaultTripContext);

  function handleSearch() {
    const params = tripContextToParams({
      ...trip,
      interests: trip.mode === "activities" ? trip.interests : "",
      destination:
        trip.mode === "destination" ? trip.destination_label : trip.destination,
    });
    params.set("step", "2");
    router.push(`/app/search?${params.toString()}`);
  }

  return (
    <section
      id="search"
      className={cn(
        "relative bg-brand-900",
        compact ? "pt-8 pb-12" : "pt-16 pb-24 lg:pt-24 lg:pb-32",
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
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
      </div>

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        {!compact && (
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-success" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span>
                Planuj wakacje{" "}
                <strong className="text-white">od aktywności</strong>
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
              compact
                ? "text-3xl md:text-4xl"
                : "text-4xl md:text-5xl lg:text-6xl",
            )}
          >
            Zaplanuj wakacje
            <br />
            <span className="text-accent-500">dopasowane do rodziny</span>
          </h1>
          {!compact && (
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
              Skąd lecisz, kiedy i co lubicie robić — znajdziemy regiony, loty i
              hotele w jednym miejscu.
            </p>
          )}
        </div>

        <div className="relative z-10 mx-auto max-w-5xl rounded-2xl bg-white p-2 shadow-hero">
          <div className="flex gap-1 border-b border-border-default px-4 pt-3">
            <TabButton
              active={trip.mode === "activities"}
              onClick={() => setTrip((t) => ({ ...t, mode: "activities" }))}
              label="Od aktywności"
              icon="target"
            />
            <TabButton
              active={trip.mode === "destination"}
              onClick={() => setTrip((t) => ({ ...t, mode: "destination" }))}
              label="Od destynacji"
              icon="map-pin"
            />
          </div>

          <div className="p-3 md:p-4">
            <TripSearchForm
              trip={trip}
              onChange={setTrip}
              showInterests={trip.mode === "activities"}
              showDestination={trip.mode === "destination"}
              large
            />

            <button
              type="button"
              onClick={handleSearch}
              className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent-500 px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-accent-600 hover:shadow-lg active:scale-[0.99]"
            >
              <Icon name="search" size={20} />
              Szukaj wakacji
            </button>
          </div>
        </div>

        {!compact && (
          <div className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-white/70">
            <TrustBadge>Bez ukrytych kosztów</TrustBadge>
            <TrustBadge>Bezpośrednie linki do partnerów</TrustBadge>
            <TrustBadge>Inteligentne porady przed wyjazdem</TrustBadge>
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
  icon: "target" | "map-pin";
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
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
}

function TrustBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon name="check" size={16} className="text-success" />
      {children}
    </span>
  );
}
