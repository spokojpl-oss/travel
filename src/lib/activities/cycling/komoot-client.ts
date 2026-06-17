import {
  isKomootCyclingSport,
  komootTourUrl,
} from "@/lib/activities/cycling/komoot-links";
import { lineStringWkt, pointWkt } from "@/lib/activities/cycling/geometry";
import type { ActivityType } from "@/types/activities";
import type { Json } from "@/types/database";

const KOMOOT_API = "https://api.komoot.de/v007";

export type KomootTourSummary = {
  id: number;
  name: string;
  sport: string;
  distance_m: number;
  elevation_gain_m: number | null;
  elevation_loss_m: number | null;
  start_lat: number;
  start_lng: number;
  type: string;
  status: string;
};

export type KomootTourCoordinate = {
  lat: number;
  lng: number;
  alt?: number;
  t?: number;
};

function mapKomootSportToActivityType(sport: string): ActivityType {
  switch (sport) {
    case "racebike":
    case "e_racebike":
    case "citybike":
      return "cycling_road";
    case "mtb_easy":
    case "e_mtb_easy":
      return "cycling_gravel";
    case "mtb":
    case "e_mtb":
    case "mtb_advanced":
    case "e_mtb_advanced":
    case "downhillbike":
      return "cycling_mtb";
    case "e_touringbicycle":
      return "cycling_ebike";
    case "touringbicycle":
    default:
      return "cycling_touring";
  }
}

export async function fetchKomootTourSummary(
  tourId: string | number,
): Promise<KomootTourSummary | null> {
  const res = await fetch(`${KOMOOT_API}/tours/${tourId}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    id: number;
    name: string;
    sport: string;
    distance: number;
    elevation_up?: number;
    elevation_down?: number;
    start_point?: { lat: number; lng: number };
    type?: string;
    status?: string;
  };

  if (!isKomootCyclingSport(data.sport)) return null;
  if (!data.start_point) return null;

  return {
    id: data.id,
    name: data.name,
    sport: data.sport,
    distance_m: Math.round(data.distance),
    elevation_gain_m:
      data.elevation_up != null ? Math.round(data.elevation_up) : null,
    elevation_loss_m:
      data.elevation_down != null ? Math.round(data.elevation_down) : null,
    start_lat: data.start_point.lat,
    start_lng: data.start_point.lng,
    type: data.type ?? "tour_planned",
    status: data.status ?? "public",
  };
}

export async function fetchKomootTourCoordinates(
  tourId: string | number,
): Promise<KomootTourCoordinate[]> {
  const res = await fetch(`${KOMOOT_API}/tours/${tourId}/coordinates`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    items?: Array<{ lat: number; lng: number; alt?: number; t?: number }>;
  };
  return data.items ?? [];
}

export function komootTourToActivityRouteInsert(
  destinationId: string,
  tour: KomootTourSummary,
  coordinates: KomootTourCoordinate[],
) {
  const coords = coordinates.filter(
    (c) => Number.isFinite(c.lat) && Number.isFinite(c.lng),
  );
  if (coords.length < 2) return null;

  const geometryWkt = lineStringWkt(coords.map((c) => [c.lng, c.lat]));
  if (!geometryWkt) return null;

  const elevation_profile =
    tour.elevation_gain_m != null
      ? coords.map((c, i) => ({
          km: (i / Math.max(coords.length - 1, 1)) * (tour.distance_m / 1000),
          elev_m: Math.round(c.alt ?? 0),
        }))
      : null;

  const externalUrl = komootTourUrl(String(tour.id), "pl");

  return {
    destination_id: destinationId,
    category: "cycling" as const,
    activity_type: mapKomootSportToActivityType(tour.sport),
    source: "komoot" as const,
    source_external_id: `komoot:tour/${tour.id}`,
    external_url: externalUrl,
    name: tour.name,
    distance_m: tour.distance_m,
    elevation_gain_m: tour.elevation_gain_m,
    elevation_loss_m: tour.elevation_loss_m,
    is_loop: false,
    start_point: pointWkt(tour.start_lng, tour.start_lat),
    geometry: geometryWkt,
    elevation_profile: elevation_profile as unknown as Json,
    popularity_score: 70,
  };
}
