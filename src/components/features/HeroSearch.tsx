"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/Icon";
import { TripSearchForm } from "@/components/features/TripSearchForm";
import {
  defaultTripContext,
  mergeTripContext,
  resolvePlaceCoords,
  tripContextFromParams,
  tripContextToParams,
  type TripContext,
} from "@/lib/search/trip-context";
import { agentLog } from "@/lib/debug/agent-log";

function HeroSearchContent({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trip, setTrip] = useState<TripContext>(defaultTripContext);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const fromUrl = tripContextFromParams(searchParams);
    if (Object.keys(fromUrl).length > 0) {
      setTrip(mergeTripContext(defaultTripContext(), fromUrl));
    }
    setHydrated(true);
    if (window.location.hash === "#search") {
      document.getElementById("search")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [searchParams]);

  async function handleSearch() {
    setSubmitting(true);
    const heroStart = Date.now();
    try {
      let nextTrip = { ...trip };

      if (
        nextTrip.mode === "destination" &&
        (nextTrip.destination_lat == null || nextTrip.destination_lon == null)
      ) {
        const label =
          nextTrip.destination_label ?? nextTrip.destination ?? "";
        const geoStart = Date.now();
        const coords = await resolvePlaceCoords(label);
        agentLog(
          "HeroSearch.tsx:handleSearch",
          "geocode done",
          {
            geo_ms: Date.now() - geoStart,
            found: coords != null,
            label_len: label.length,
          },
          "D",
        );
        if (coords) {
          nextTrip = {
            ...nextTrip,
            destination_lat: coords.lat,
            destination_lon: coords.lon,
            destination_label: coords.label,
          };
        }
      }

      if (
        nextTrip.travel_mode !== "flight" &&
        (nextTrip.origin_lat == null || nextTrip.origin_lon == null)
      ) {
        const originLabel = nextTrip.origin_label ?? "";
        if (originLabel.trim().length >= 2) {
          const originCoords = await resolvePlaceCoords(originLabel);
          if (originCoords) {
            nextTrip = {
              ...nextTrip,
              origin_lat: originCoords.lat,
              origin_lon: originCoords.lon,
              origin_label: originCoords.label,
            };
          }
        }
      }

      const params = tripContextToParams({
        ...nextTrip,
        interests: nextTrip.mode === "activities" ? nextTrip.interests : "",
        destination:
          nextTrip.mode === "destination"
            ? nextTrip.destination_label
            : nextTrip.destination,
      });
      params.set("step", "2");
      agentLog(
        "HeroSearch.tsx:handleSearch",
        "navigate to search",
        {
          hero_ms: Date.now() - heroStart,
          mode: nextTrip.mode,
          has_coords: nextTrip.destination_lat != null,
        },
        "C",
      );
      router.push(`/app/search?${params.toString()}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <section
        id="search"
        className={cn(
          "relative bg-brand-900",
          compact ? "pt-8 pb-12" : "pt-16 pb-24",
        )}
      />
    );
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
              Skąd jedziecie, jak i kiedy — znajdziemy regiony, noclegi i
              transport dopasowany do Waszego sposobu podróżowania.
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
              disabled={submitting}
              className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent-500 px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-accent-600 hover:shadow-lg active:scale-[0.99] disabled:opacity-70"
            >
              <Icon name="search" size={20} />
              {submitting ? "Przygotowuję wyszukiwanie..." : "Szukaj wakacji"}
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

export function HeroSearch({ compact = false }: { compact?: boolean }) {
  return (
    <Suspense
      fallback={
        <section
          id="search"
          className={cn(
            "relative bg-brand-900",
            compact ? "pt-8 pb-12" : "pt-16 pb-24",
          )}
        />
      }
    >
      <HeroSearchContent compact={compact} />
    </Suspense>
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
