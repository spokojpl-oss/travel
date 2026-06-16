"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { DateRangePicker } from "@/components/ui/DatePicker";
import {
  PassengerSelector,
  formatPassengers,
  parsePassengers,
} from "@/components/ui/PassengerSelector";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import {
  TRAVEL_MODE_OPTIONS,
  VEHICLE_SOURCE_OPTIONS,
  resolveFlightOriginFields,
  travelModeIcon,
  type TravelMode,
  type TripContext,
  type VehicleSource,
} from "@/lib/search/trip-context";
import { useT } from "@/i18n/locale-provider";

async function searchPlacesApi(
  query: string,
  type: "destination" | "airport",
): Promise<
  Array<{ id: string; label: string; sublabel?: string; lat?: number; lon?: number }>
> {
  const params = new URLSearchParams({ q: query, type, limit: "12" });
  const r = await fetch(`/api/places/search?${params}`);
  if (!r.ok) return [];
  const data = (await r.json()) as {
    places?: Array<{
      id: string;
      label: string;
      sublabel?: string;
      lat?: number;
      lon?: number;
    }>;
  };
  return (data.places ?? []).map((p) => ({
    id: p.id,
    label: p.label,
    sublabel: p.sublabel,
    lat: p.lat,
    lon: p.lon,
  }));
}

function applyTravelModeChange(
  trip: TripContext,
  mode: TravelMode,
): TripContext {
  if (mode === "flight") {
    return {
      ...trip,
      travel_mode: mode,
      vehicle_source: null,
      ...resolveFlightOriginFields(trip),
    };
  }

  const hadFlightOrigin = Boolean(trip.origin_iata || trip.origin_scope);
  return {
    ...trip,
    travel_mode: mode,
    vehicle_source: mode === "car" ? (trip.vehicle_source ?? "own") : null,
    origin_iata: null,
    origin_scope: null,
    origin_label: hadFlightOrigin ? "Warszawa" : (trip.origin_label ?? "Warszawa"),
    origin_lat: hadFlightOrigin ? null : trip.origin_lat,
    origin_lon: hadFlightOrigin ? null : trip.origin_lon,
  };
}

export function TripSearchForm({
  trip,
  onChange,
  showDestination = true,
  showInterests = false,
  large = false,
  compact = false,
  className,
  groupSource = null,
  onClearGroupSource,
}: {
  trip: TripContext;
  onChange: (trip: TripContext) => void;
  showDestination?: boolean;
  showInterests?: boolean;
  large?: boolean;
  compact?: boolean;
  className?: string;
  groupSource?: { id: string; name: string } | null;
  onClearGroupSource?: () => void;
}) {
  const t = useT();
  const searchAirports = useCallback(
    (q: string) => searchPlacesApi(q, "airport"),
    [],
  );
  const searchCities = useCallback(
    (q: string) => searchPlacesApi(q, "destination"),
    [],
  );
  const searchDestinations = searchCities;

  const minDate = new Date().toISOString().split("T")[0];
  const passengers = useMemo(
    () => parsePassengers(trip.passengers),
    [trip.passengers],
  );
  const isFlight = trip.travel_mode === "flight";
  const isCar = trip.travel_mode === "car";

  const travelModeLabel = (mode: TravelMode) => {
    const map: Record<TravelMode, string> = {
      car: t("travel.car"),
      train: t("travel.train"),
      bus: t("travel.bus"),
      flight: t("travel.flight"),
    };
    return map[mode];
  };

  const vehicleSourceLabel = (source: VehicleSource) =>
    source === "own" ? t("travel.own") : t("travel.rental");

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3", className)}>
      {showInterests && (
        <FieldShell label={t("form.interests")} icon="target" large={large && !compact} compact={compact}>
          <input
            type="text"
            placeholder={t("form.interestsPlaceholder")}
            value={trip.interests}
            onChange={(e) => onChange({ ...trip, interests: e.target.value })}
            className={cn(
              "w-full border-0 bg-transparent p-0 font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none",
              large ? "text-lg font-semibold" : "text-base",
            )}
          />
        </FieldShell>
      )}

      {showDestination && trip.mode === "destination" && (
        <Autocomplete
          label={t("form.destination")}
          icon="map-pin"
          placeholder={t("form.destinationPlaceholder")}
          value={trip.destination_label ?? trip.destination ?? ""}
          onValueChange={(v) =>
            onChange({
              ...trip,
              destination: v,
              destination_label: v,
              destination_lat: null,
              destination_lon: null,
            })
          }
          onSelect={(opt) =>
            onChange({
              ...trip,
              destination: opt.id,
              destination_label: opt.sublabel
                ? `${opt.label}, ${opt.sublabel}`
                : opt.label,
              destination_lat: opt.lat ?? null,
              destination_lon: opt.lon ?? null,
            })
          }
          options={[]}
          onSearch={searchDestinations}
          large={large && !compact}
        />
      )}

      <DateRangePicker
        labelFrom={t("form.departure")}
        labelTo={t("form.return")}
        fromValue={trip.departure_date}
        toValue={trip.return_date ?? ""}
        onFromChange={(v, suggestedTo) => {
          onChange({
            ...trip,
            departure_date: v,
            return_date: suggestedTo ?? trip.return_date,
          });
        }}
        onToChange={(v) => {
          onChange({ ...trip, return_date: v || null });
        }}
        min={minDate}
        large={large && !compact}
      />

      <FieldShell label={t("form.howTravel")} icon="route" large={large && !compact} compact={compact}>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_MODE_OPTIONS.map((option) => (
            <ChoiceChip
              key={option.value}
              active={trip.travel_mode === option.value}
              icon={travelModeIcon(option.value)}
              label={travelModeLabel(option.value)}
              compact={compact}
              onClick={() => onChange(applyTravelModeChange(trip, option.value))}
            />
          ))}
        </div>
      </FieldShell>

      {isCar && (
        <FieldShell label={t("form.car")} icon="car" large={large && !compact} compact={compact}>
          <div className="flex flex-wrap gap-2">
            {VEHICLE_SOURCE_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.value}
                active={trip.vehicle_source === option.value}
                icon={option.value === "own" ? "car" : "route"}
                label={vehicleSourceLabel(option.value)}
                compact={compact}
                onClick={() =>
                  onChange({
                    ...trip,
                    vehicle_source: option.value as VehicleSource,
                  })
                }
              />
            ))}
          </div>
        </FieldShell>
      )}

      <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
        {isFlight ? (
          <Autocomplete
            label={t("form.fromFlight")}
            icon="plane"
            placeholder={t("form.originFlightPlaceholder")}
            value={trip.origin_label ?? trip.origin_iata ?? ""}
            onValueChange={(v) =>
              onChange({
                ...trip,
                origin_label: v,
                origin_iata: null,
                origin_scope: null,
              })
            }
            onSelect={(opt) => {
              if (opt.id.startsWith("country:")) {
                const countryCode = opt.id.replace("country:", "").toUpperCase();
                onChange({
                  ...trip,
                  origin_iata: null,
                  origin_scope: countryCode,
                  origin_label: opt.sublabel
                    ? `${opt.label} — ${opt.sublabel}`
                    : opt.label,
                  origin_lat: null,
                  origin_lon: null,
                });
                return;
              }
              const iata = opt.id.replace(/^airport:/, "").slice(0, 3);
              onChange({
                ...trip,
                origin_iata: iata.length === 3 ? iata : null,
                origin_scope: null,
                origin_label: opt.sublabel
                  ? `${opt.label} (${opt.sublabel.split(" · ")[0]})`
                  : opt.label,
                origin_lat: null,
                origin_lon: null,
              });
            }}
            options={[]}
            onSearch={searchAirports}
            large={large && !compact}
          />
        ) : (
          <Autocomplete
            label={t("form.fromGround")}
            icon="map-pin"
            placeholder={t("form.originGroundPlaceholder")}
            value={trip.origin_label ?? ""}
            onValueChange={(v) =>
              onChange({
                ...trip,
                origin_label: v,
                origin_lat: null,
                origin_lon: null,
              })
            }
            onSelect={(opt) =>
              onChange({
                ...trip,
                origin_label: opt.sublabel
                  ? `${opt.label}, ${opt.sublabel}`
                  : opt.label,
                origin_lat: opt.lat ?? null,
                origin_lon: opt.lon ?? null,
              })
            }
            options={[]}
            onSearch={searchCities}
            large={large && !compact}
          />
        )}
        <PassengerSelector
          value={passengers}
          onChange={(p) => {
            onClearGroupSource?.();
            onChange({ ...trip, passengers: formatPassengers(p) });
          }}
          large={large && !compact}
          compact={compact}
          hint={
            groupSource ? (
              <>
                {t("passengers.fromGroup")}{" "}
                <Link
                  href={`/app/groups/${groupSource.id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {groupSource.name}
                </Link>
              </>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}

function ChoiceChip({
  active,
  icon,
  label,
  compact,
  onClick,
}: {
  active: boolean;
  icon: IconName;
  label: string;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border font-medium transition-colors",
        compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
        active
          ? "border-brand-700 bg-brand-50 text-brand-800"
          : "border-border-default bg-white text-text-secondary hover:border-brand-300 hover:text-text-primary",
      )}
    >
      <Icon name={icon} size={compact ? 14 : 16} />
      {label}
    </button>
  );
}

function FieldShell({
  label,
  icon,
  large,
  compact,
  children,
}: {
  label: string;
  icon: IconName;
  large?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border-default transition-all hover:border-brand-300 focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-100",
        compact ? "p-2.5" : large ? "border-2 p-4 focus-within:ring-4" : "p-3",
      )}
    >
      <div
        className={cn(
          "mb-2 flex items-center gap-2 font-semibold uppercase tracking-wide text-text-tertiary",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        <Icon name={icon} size={14} />
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}
