import { POLISH_AIRPORT_IATAS } from "@/lib/flights/polish-airports";
import {
  defaultExplorationScope,
  explorationScopeFromString,
  type ExplorationScope,
} from "@/lib/search/exploration-scope";
import {
  tripRhythmFromParams,
  tripRhythmToParams,
  type TripRhythm,
} from "@/lib/search/trip-rhythm";

export type { ExplorationScope };

export type TravelMode = "car" | "train" | "bus" | "flight";
export type VehicleSource = "own" | "rental";

export type TripContext = {
  mode: "activities" | "destination";
  interests: string;
  destination: string | null;
  destination_label: string | null;
  destination_lat: number | null;
  destination_lon: number | null;
  departure_date: string;
  return_date: string | null;
  travel_mode: TravelMode;
  vehicle_source: VehicleSource | null;
  origin_iata: string | null;
  origin_label: string | null;
  /** Kod kraju (np. PL) — szukaj lotów ze wszystkich lotnisk w kraju. */
  origin_scope: string | null;
  origin_lat: number | null;
  origin_lon: number | null;
  passengers: string;
  /** Jak użytkownik chce zwiedzać destynację — wpływa na promień klastrów. */
  exploration_scope: ExplorationScope | null;
  /** Rozkład dni (plaża, miasta, …) — krok przed wyborem regionu. */
  trip_rhythm: TripRhythm | null;
  /** Wybrany region turystyczny z poradnika (id) — pierwszy z listy, kompatybilność wsteczna. */
  tourist_region_id: string | null;
  /** Do 3 regionów — np. tydzień Pafos + tydzień Ayia Napa. */
  tourist_region_ids: string[];
};

export const MAX_TOURIST_REGIONS = 3;

export function parseTouristRegionParam(value: string | null): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_TOURIST_REGIONS);
}

export function serializeTouristRegionIds(ids: string[]): string | null {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, MAX_TOURIST_REGIONS);
  return unique.length > 0 ? unique.join(",") : null;
}

export const TRAVEL_MODE_OPTIONS: Array<{
  value: TravelMode;
  label: string;
  shortLabel: string;
}> = [
  { value: "flight", label: "Samolot", shortLabel: "Lot" },
  { value: "car", label: "Samochód", shortLabel: "Auto" },
];

export const VEHICLE_SOURCE_OPTIONS: Array<{
  value: VehicleSource;
  label: string;
}> = [
  { value: "own", label: "Własny" },
  { value: "rental", label: "Wynajęty" },
];

export const TRIP_CONTEXT_KEY = "trip_search_context";
export const HERO_SEARCH_KEY = "hero_search_params";

/** ISO YYYY-MM-DD w lokalnej strefie (bez przesunięcia UTC z toISOString). */
export function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDateLocal(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysBetweenIso(from: string, to: string): number {
  const a = parseIsoDateLocal(from);
  const b = parseIsoDateLocal(to);
  if (!a || !b) return 7;
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return Math.max(1, diff);
}

/** Domyślna długość wyjazdu przy wyborze daty wyjazdu (najczęstszy case). */
export const DEFAULT_TRIP_LENGTH_DAYS = 7;

export function suggestedReturnDateIso(
  departureIso: string,
  tripLengthDays = DEFAULT_TRIP_LENGTH_DAYS,
): string {
  const start = parseIsoDateLocal(departureIso);
  if (!start) return departureIso;
  const end = new Date(start);
  end.setDate(start.getDate() + tripLengthDays);
  return localIsoDate(end);
}

export function defaultDateRangeFromToday(
  offsetDays = 30,
  lengthDays = 7,
): { from: string; to: string } {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() + offsetDays);
  const end = new Date(start);
  end.setDate(start.getDate() + lengthDays);
  return { from: localIsoDate(start), to: localIsoDate(end) };
}

export function defaultPolandFlightOriginFields(): Pick<
  TripContext,
  "origin_scope" | "origin_label" | "origin_iata" | "origin_lat" | "origin_lon"
> {
  return {
    origin_scope: "PL",
    origin_label: `Polska — Wszystkie lotniska (${POLISH_AIRPORT_IATAS.length})`,
    origin_iata: null,
    origin_lat: null,
    origin_lon: null,
  };
}

export function resolveFlightOriginFields(
  trip: Pick<TripContext, "origin_iata" | "origin_scope" | "origin_label">,
): Pick<
  TripContext,
  "origin_scope" | "origin_label" | "origin_iata" | "origin_lat" | "origin_lon"
> {
  if (trip.origin_iata) {
    return {
      origin_scope: null,
      origin_iata: trip.origin_iata,
      origin_label: trip.origin_label,
      origin_lat: null,
      origin_lon: null,
    };
  }
  if (trip.origin_scope) {
    return {
      origin_scope: trip.origin_scope,
      origin_iata: null,
      origin_label:
        trip.origin_label ?? defaultPolandFlightOriginFields().origin_label,
      origin_lat: null,
      origin_lon: null,
    };
  }
  return defaultPolandFlightOriginFields();
}

export function defaultTripContext(): TripContext {
  const { from, to } = defaultDateRangeFromToday(30, 7);

  return normalizeTripContext({
    mode: "destination",
    interests: "",
    destination: null,
    destination_label: null,
    destination_lat: null,
    destination_lon: null,
    departure_date: from,
    return_date: to,
    travel_mode: "flight",
    vehicle_source: null,
    origin_iata: null,
    origin_label: null,
    origin_scope: null,
    origin_lat: null,
    origin_lon: null,
    passengers: "2 dorosłych",
    exploration_scope: null,
    trip_rhythm: null,
    tourist_region_id: null,
    tourist_region_ids: [],
  });
}

export function inferTravelMode(
  partial: Partial<TripContext>,
): TravelMode | undefined {
  if (partial.travel_mode) return partial.travel_mode;
  if (partial.origin_iata) return "flight";
  if (partial.origin_scope) return "flight";
  return undefined;
}

export function normalizeTripContext(trip: TripContext): TripContext {
  let ids = trip.tourist_region_ids ?? [];
  if (ids.length === 0 && trip.tourist_region_id) {
    ids = [trip.tourist_region_id];
  }
  ids = [...new Set(ids.filter(Boolean))].slice(0, MAX_TOURIST_REGIONS);
  const synced: TripContext = {
    ...trip,
    tourist_region_ids: ids,
    tourist_region_id: ids[0] ?? null,
  };

  let travel_mode = synced.travel_mode ?? inferTravelMode(synced) ?? "flight";
  if (travel_mode === "train" || travel_mode === "bus") {
    travel_mode = "flight";
  }

  if (travel_mode === "flight") {
    return {
      ...synced,
      travel_mode,
      vehicle_source: null,
      ...resolveFlightOriginFields(synced),
    };
  }

  return {
    ...synced,
    travel_mode,
    vehicle_source:
      travel_mode === "car" ? (synced.vehicle_source ?? "own") : null,
    origin_iata: null,
    origin_scope: null,
  };
}

export function travelModeIcon(mode: TravelMode): "car" | "train" | "bus" | "plane" {
  switch (mode) {
    case "car":
      return "car";
    case "train":
      return "train";
    case "bus":
      return "bus";
    case "flight":
      return "plane";
  }
}

export function formatTravelOrigin(trip: TripContext): string {
  const origin = trip.origin_label ?? trip.origin_iata ?? "—";
  if (trip.travel_mode === "car" && trip.vehicle_source) {
    const vehicle =
      trip.vehicle_source === "own" ? "własny" : "wynajęty";
    return `${origin} (${vehicle} samochód)`;
  }
  const modeLabel =
    TRAVEL_MODE_OPTIONS.find((o) => o.value === trip.travel_mode)?.label ??
    trip.travel_mode;
  return `${origin} (${modeLabel.toLowerCase()})`;
}

export function formatTravelSummary(trip: TripContext): string {
  const mode =
    TRAVEL_MODE_OPTIONS.find((o) => o.value === trip.travel_mode)?.label ??
    "Podróż";
  const origin = trip.origin_label ?? trip.origin_iata;
  if (!origin) return mode;
  if (trip.travel_mode === "flight") return `Lot z: ${origin}`;
  if (trip.travel_mode === "car" && trip.vehicle_source) {
    const vehicle = trip.vehicle_source === "own" ? "własnym" : "wynajętym";
    return `${mode} ${vehicle} z: ${origin}`;
  }
  return `${mode} z: ${origin}`;
}

export function tripContextToParams(trip: TripContext): URLSearchParams {
  const p = new URLSearchParams();
  p.set("mode", trip.mode);
  if (trip.interests) p.set("interests", trip.interests);
  if (trip.destination) p.set("destination", trip.destination);
  if (trip.destination_label) p.set("destination_label", trip.destination_label);
  if (trip.destination_lat != null) p.set("dest_lat", String(trip.destination_lat));
  if (trip.destination_lon != null) p.set("dest_lon", String(trip.destination_lon));
  if (trip.departure_date) p.set("from_date", trip.departure_date);
  if (trip.return_date) p.set("to_date", trip.return_date);
  p.set("travel_mode", trip.travel_mode);
  if (trip.vehicle_source) p.set("vehicle_source", trip.vehicle_source);
  if (trip.origin_iata) p.set("origin", trip.origin_iata);
  if (trip.origin_scope) p.set("origin_scope", trip.origin_scope);
  if (trip.origin_label) p.set("origin_label", trip.origin_label);
  if (trip.exploration_scope) p.set("exploration_scope", trip.exploration_scope);
  if (trip.origin_lat != null) p.set("origin_lat", String(trip.origin_lat));
  if (trip.origin_lon != null) p.set("origin_lon", String(trip.origin_lon));
  if (trip.passengers) p.set("passengers", trip.passengers);
  if (trip.tourist_region_ids.length > 0) {
    const serialized = serializeTouristRegionIds(trip.tourist_region_ids);
    if (serialized) p.set("tourist_region", serialized);
  } else if (trip.tourist_region_id) {
    p.set("tourist_region", trip.tourist_region_id);
  }
  const rhythmParams = trip.trip_rhythm
    ? tripRhythmToParams(trip.trip_rhythm)
    : null;
  if (rhythmParams) {
    rhythmParams.forEach((value, key) => p.set(key, value));
  }
  return p;
}

export function tripContextFromParams(
  params: URLSearchParams,
): Partial<TripContext> {
  const partial: Partial<TripContext> = {};
  const mode = params.get("mode");
  if (mode === "activities" || mode === "destination") partial.mode = mode;
  const interests = params.get("interests");
  if (interests) partial.interests = interests;
  const destination = params.get("destination");
  if (destination) partial.destination = destination;
  const destinationLabel = params.get("destination_label");
  if (destinationLabel) partial.destination_label = destinationLabel;
  const destLat = params.get("dest_lat");
  if (destLat) partial.destination_lat = Number(destLat);
  const destLon = params.get("dest_lon");
  if (destLon) partial.destination_lon = Number(destLon);
  const fromDate = params.get("from_date");
  if (fromDate) partial.departure_date = fromDate;
  const toDate = params.get("to_date");
  if (toDate) partial.return_date = toDate;
  const travelMode = params.get("travel_mode");
  if (
    travelMode === "car" ||
    travelMode === "train" ||
    travelMode === "bus" ||
    travelMode === "flight"
  ) {
    partial.travel_mode = travelMode;
  }
  const vehicleSource = params.get("vehicle_source");
  if (vehicleSource === "own" || vehicleSource === "rental") {
    partial.vehicle_source = vehicleSource;
  }
  const origin = params.get("origin");
  if (origin) partial.origin_iata = origin;
  const originScope = params.get("origin_scope");
  if (originScope) partial.origin_scope = originScope.toUpperCase();
  const originLabel = params.get("origin_label");
  if (originLabel) partial.origin_label = originLabel;
  const originLat = params.get("origin_lat");
  if (originLat) partial.origin_lat = Number(originLat);
  const originLon = params.get("origin_lon");
  if (originLon) partial.origin_lon = Number(originLon);
  const passengers = params.get("passengers");
  if (passengers) partial.passengers = passengers;
  const explorationScope = explorationScopeFromString(
    params.get("exploration_scope"),
  );
  if (explorationScope) partial.exploration_scope = explorationScope;
  const rhythm = tripRhythmFromParams(params);
  if (rhythm) partial.trip_rhythm = rhythm;
  const touristRegion = params.get("tourist_region");
  if (touristRegion) {
    const ids = parseTouristRegionParam(touristRegion);
    partial.tourist_region_ids = ids;
    partial.tourist_region_id = ids[0] ?? null;
  }
  return partial;
}

export function hasTripParams(params: URLSearchParams): boolean {
  return (
    params.has("from_date") ||
    params.has("mode") ||
    params.has("interests") ||
    params.has("destination") ||
    params.has("destination_label") ||
    params.has("origin") ||
    params.has("origin_scope") ||
    params.has("origin_label") ||
    params.has("travel_mode")
  );
}

export function mergeTripContext(
  base: TripContext,
  partial: Partial<TripContext>,
): TripContext {
  const merged = { ...base, ...partial };
  if (merged.mode === "destination" && !merged.exploration_scope) {
    merged.exploration_scope = defaultExplorationScope();
  }
  return normalizeTripContext(merged);
}

export function formatTripDateRange(
  trip: TripContext,
  intlLocale = "pl-PL",
): string {
  const from = trip.departure_date
    ? parseIsoDateLocal(trip.departure_date)?.toLocaleDateString(intlLocale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) ?? "—"
    : "—";
  const to = trip.return_date
    ? parseIsoDateLocal(trip.return_date)?.toLocaleDateString(intlLocale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) ?? null
    : null;
  return to ? `${from} – ${to}` : from;
}

export function matchActivitySlugsFromText(
  text: string,
  taxonomy: Array<{
    activities: Array<{ slug: string; name_pl: string; name_en: string }>;
  }>,
): string[] {
  const tokens = text
    .toLowerCase()
    .split(/[,;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);

  if (tokens.length === 0 && text.trim().length >= 3) {
    tokens.push(text.trim().toLowerCase());
  }

  const slugs = new Set<string>();
  for (const group of taxonomy) {
    for (const act of group.activities) {
      const pl = act.name_pl.toLowerCase();
      const en = act.name_en.toLowerCase();
      const slug = act.slug.replace(/_/g, " ");
      for (const token of tokens) {
        if (
          pl.includes(token) ||
          en.includes(token) ||
          slug.includes(token) ||
          token.includes(pl) ||
          token.includes(slug)
        ) {
          slugs.add(act.slug);
        }
      }
    }
  }
  return Array.from(slugs);
}

export async function resolvePlaceCoords(
  label: string,
): Promise<{ lat: number; lon: number; label: string } | null> {
  const q = label.trim();
  if (q.length < 2) return null;

  try {
    const params = new URLSearchParams({ q, type: "destination", limit: "1" });
    const r = await fetch(`/api/places/search?${params}`);
    if (!r.ok) return null;
    const data = (await r.json()) as {
      places?: Array<{ label: string; sublabel?: string; lat?: number; lon?: number }>;
    };
    const place = data.places?.find(
      (p) =>
        p.lat != null &&
        p.lon != null &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lon),
    );
    if (
      place?.lat == null ||
      place?.lon == null ||
      !Number.isFinite(place.lat) ||
      !Number.isFinite(place.lon)
    ) {
      return null;
    }
    const resolvedLabel = place.sublabel
      ? place.sublabel.includes(place.label)
        ? place.sublabel
        : `${place.label}, ${place.sublabel}`
      : place.label;
    return { lat: place.lat, lon: place.lon, label: resolvedLabel };
  } catch {
    return null;
  }
}

/** @deprecated Użyj resolvePlaceCoords */
export const resolveDestinationCoords = resolvePlaceCoords;
