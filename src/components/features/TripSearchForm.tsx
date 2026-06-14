"use client";

import { useCallback } from "react";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { DateRangePicker } from "@/components/ui/DatePicker";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import type { TripContext } from "@/lib/search/trip-context";

async function searchPlacesApi(
  query: string,
  type: "destination" | "airport",
): Promise<Array<{ id: string; label: string; sublabel?: string }>> {
  const params = new URLSearchParams({ q: query, type, limit: "12" });
  const r = await fetch(`/api/places/search?${params}`);
  if (!r.ok) return [];
  const data = (await r.json()) as {
    places?: Array<{ id: string; label: string; sublabel?: string }>;
  };
  return data.places ?? [];
}

export function TripSearchForm({
  trip,
  onChange,
  showDestination = true,
  showInterests = false,
  large = false,
  className,
}: {
  trip: TripContext;
  onChange: (trip: TripContext) => void;
  showDestination?: boolean;
  showInterests?: boolean;
  large?: boolean;
  className?: string;
}) {
  const searchAirports = useCallback(
    (q: string) => searchPlacesApi(q, "airport"),
    [],
  );
  const searchDestinations = useCallback(
    (q: string) => searchPlacesApi(q, "destination"),
    [],
  );

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <div className={cn("space-y-3", className)}>
      {showInterests && (
        <FieldShell label="Co chcecie robić?" icon="target" large={large}>
          <input
            type="text"
            placeholder="np. quady, rowery, jaskinie"
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
          label="Dokąd?"
          icon="map-pin"
          placeholder="Dowolne miejsce na świecie..."
          value={trip.destination_label ?? trip.destination ?? ""}
          onValueChange={(v) =>
            onChange({
              ...trip,
              destination: v,
              destination_label: v,
            })
          }
          onSelect={(opt) =>
            onChange({
              ...trip,
              destination: opt.id,
              destination_label: opt.sublabel
                ? `${opt.label}, ${opt.sublabel}`
                : opt.label,
            })
          }
          options={[]}
          onSearch={searchDestinations}
          large={large}
        />
      )}

      <DateRangePicker
        fromValue={trip.departure_date}
        toValue={trip.return_date ?? trip.departure_date}
        onFromChange={(v) => onChange({ ...trip, departure_date: v })}
        onToChange={(v) => onChange({ ...trip, return_date: v })}
        min={minDate}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Autocomplete
          label="Skąd? (lotnisko)"
          icon="plane"
          placeholder="Warszawa, Berlin, Bangkok..."
          value={trip.origin_label ?? trip.origin_iata ?? ""}
          onValueChange={(v) =>
            onChange({
              ...trip,
              origin_label: v,
              origin_iata: null,
            })
          }
          onSelect={(opt) => {
            const iata = opt.id.replace(/^airport:/, "").slice(0, 3);
            onChange({
              ...trip,
              origin_iata: iata.length === 3 ? iata : null,
              origin_label: opt.sublabel
                ? `${opt.label} (${opt.sublabel.split(" · ")[0]})`
                : opt.label,
            });
          }}
          options={[]}
          onSearch={searchAirports}
          large={large}
        />
        <FieldShell label="Ile osób?" icon="users" large={large}>
          <input
            type="text"
            placeholder="2 dorosłych, 1 dziecko"
            value={trip.passengers}
            onChange={(e) =>
              onChange({ ...trip, passengers: e.target.value })
            }
            className={cn(
              "w-full border-0 bg-transparent p-0 font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none",
              large ? "text-lg font-semibold" : "text-base",
            )}
          />
        </FieldShell>
      </div>
    </div>
  );
}

function FieldShell({
  label,
  icon,
  large,
  children,
}: {
  label: string;
  icon: IconName;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border-default p-3 transition-all hover:border-brand-300 focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-100",
        large && "border-2 p-4 focus-within:ring-4",
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        <Icon name={icon} size={14} />
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}
