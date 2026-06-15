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
import { useT } from "@/i18n/locale-provider";

function HeroSearchContent({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trip, setTrip] = useState<TripContext>(defaultTripContext());
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [activeGroup, setActiveGroup] = useState<{
    id: string;
    name: string;
  } | null>(null);

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

  useEffect(() => {
    if (!hydrated || searchParams.get("passengers")) return;

    fetch("/api/groups/default")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (data: {
          group?: { id: string; name: string } | null;
          passengers?: string | null;
        } | null) => {
          if (!data?.group?.id || !data.passengers) return;
          setActiveGroup(data.group);
          setTrip((current) => ({
            ...current,
            passengers: data.passengers!,
          }));
        },
      )
      .catch(() => {});
  }, [hydrated, searchParams]);

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
            {t("hero.title1")}
            <br />
            <span className="text-accent-500">{t("hero.title2")}</span>
          </h1>
          {!compact && (
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
              {t("hero.subtitle")}
            </p>
          )}
        </div>

        <div className="relative z-10 mx-auto max-w-5xl rounded-2xl bg-white p-2 shadow-hero">
          <div className="flex gap-1 border-b border-border-default px-4 pt-3">
            <TabButton
              active={trip.mode === "activities"}
              onClick={() => setTrip((t) => ({ ...t, mode: "activities" }))}
              label={t("hero.tabActivities")}
              icon="target"
            />
            <TabButton
              active={trip.mode === "destination"}
              onClick={() => setTrip((t) => ({ ...t, mode: "destination" }))}
              label={t("hero.tabDestination")}
              icon="map-pin"
            />
          </div>

          <div className="p-3 md:p-4">
            <TripSearchForm
              trip={trip}
              onChange={setTrip}
              showInterests={trip.mode === "activities"}
              showDestination={trip.mode === "destination"}
              groupSource={activeGroup}
              onClearGroupSource={() => setActiveGroup(null)}
              large
            />

            <button
              type="button"
              onClick={handleSearch}
              disabled={submitting}
              className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-xl bg-accent-500 px-8 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-accent-600 hover:shadow-lg active:scale-[0.99] disabled:opacity-70"
            >
              <Icon name="search" size={20} />
              {submitting ? t("hero.searching") : t("hero.search")}
            </button>
          </div>
        </div>

        {!compact && (
          <div className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-white/70">
            <TrustBadge>{t("hero.trustNoFees")}</TrustBadge>
            <TrustBadge>{t("hero.trustDirectLinks")}</TrustBadge>
            <TrustBadge>{t("hero.trustAdvisories")}</TrustBadge>
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
