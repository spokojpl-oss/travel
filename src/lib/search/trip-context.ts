export type TripContext = {
  mode: "activities" | "destination";
  interests: string;
  destination: string | null;
  destination_label: string | null;
  destination_lat: number | null;
  destination_lon: number | null;
  departure_date: string;
  return_date: string | null;
  origin_iata: string | null;
  origin_label: string | null;
  passengers: string;
};

export const TRIP_CONTEXT_KEY = "trip_search_context";
export const HERO_SEARCH_KEY = "hero_search_params";

export function defaultTripContext(): TripContext {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() + 30);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return {
    mode: "activities",
    interests: "",
    destination: null,
    destination_label: null,
    destination_lat: null,
    destination_lon: null,
    departure_date: start.toISOString().split("T")[0],
    return_date: end.toISOString().split("T")[0],
    origin_iata: "WAW",
    origin_label: "Warszawa Chopin (WAW)",
    passengers: "2 dorosłych",
  };
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
  if (trip.origin_iata) p.set("origin", trip.origin_iata);
  if (trip.origin_label) p.set("origin_label", trip.origin_label);
  if (trip.passengers) p.set("passengers", trip.passengers);
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
  const origin = params.get("origin");
  if (origin) partial.origin_iata = origin;
  const originLabel = params.get("origin_label");
  if (originLabel) partial.origin_label = originLabel;
  const passengers = params.get("passengers");
  if (passengers) partial.passengers = passengers;
  return partial;
}

export function mergeTripContext(
  base: TripContext,
  partial: Partial<TripContext>,
): TripContext {
  return { ...base, ...partial };
}

export function formatTripDateRange(trip: TripContext): string {
  const from = trip.departure_date
    ? new Date(trip.departure_date).toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
  const to = trip.return_date
    ? new Date(trip.return_date).toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
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
