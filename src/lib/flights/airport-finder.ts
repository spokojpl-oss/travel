import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolveIslandBoundaryForSearch,
  type IslandBoundary,
} from "@/lib/destinations/island-boundary";
import { distanceKm } from "@/lib/search/geo-clustering";
import type { BoundingBox, GeoPoint } from "@/types/domain";
import type { Database } from "@/types/database";

const KM_PER_DEG_LAT = 111.32;

type AirportRow = Database["public"]["Tables"]["airports"]["Row"];

export type DestinationAirport = {
  iata_code: string;
  name: string;
  city: string | null;
  country_code: string;
  lat: number;
  lon: number;
  airport_type: string;
  distance_km: number;
  priority: number;
};

export async function findAirportsForDestination({
  center,
  bbox,
  destinationLabel,
  maxDistanceKm = 80,
  maxResults = 5,
}: {
  center: GeoPoint;
  bbox: BoundingBox;
  destinationLabel?: string | null;
  maxDistanceKm?: number;
  maxResults?: number;
}): Promise<DestinationAirport[]> {
  const island = resolveIslandBoundaryForSearch(destinationLabel, center);
  const searchBbox = island?.bbox ?? bbox;
  const effectiveMaxDistance = island ? 50 : maxDistanceKm;
  const effectiveMaxResults = island ? Math.max(1, island.primaryAirports.length) : maxResults;

  const supabase = createAdminClient();

  const margin = island ? 0.15 : 0.5;
  const queryBbox = {
    north: searchBbox.north + margin,
    south: searchBbox.south - margin,
    east: searchBbox.east + margin,
    west: searchBbox.west - margin,
  };

  let candidates = await queryAirportsInBBox(supabase, queryBbox);

  if ((!candidates || candidates.length === 0) && !island) {
    const latRad = (center.lat * Math.PI) / 180;
    const lonDeg = effectiveMaxDistance / (KM_PER_DEG_LAT * Math.max(0.25, Math.cos(latRad)));
    const latDeg = effectiveMaxDistance / KM_PER_DEG_LAT;
    candidates = await queryAirportsInBBox(supabase, {
      north: center.lat + latDeg,
      south: center.lat - latDeg,
      east: center.lon + lonDeg,
      west: center.lon - lonDeg,
    });
  }

  if (!candidates || candidates.length === 0) return [];

  let airports = candidates
    .map((a) => toDestinationAirport(a, center))
    .filter((a) => a.distance_km <= effectiveMaxDistance);

  if (island) {
    airports = filterAirportsToIsland(airports, island);
  }

  return airports
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.distance_km - b.distance_km;
    })
    .slice(0, effectiveMaxResults);
}

function filterAirportsToIsland(
  airports: DestinationAirport[],
  island: IslandBoundary,
): DestinationAirport[] {
  if (island.primaryAirports.length > 0) {
    const preferred = airports.filter((a) =>
      island.primaryAirports.includes(a.iata_code),
    );
    if (preferred.length > 0) return preferred;
  }

  return airports.filter(
    (a) =>
      a.lat >= island.bbox.south &&
      a.lat <= island.bbox.north &&
      a.lon >= island.bbox.west &&
      a.lon <= island.bbox.east,
  );
}

export async function persistDestinationAirports(
  destinationId: string,
  airports: DestinationAirport[],
): Promise<void> {
  if (airports.length === 0) return;

  const supabase = createAdminClient();
  await supabase.from("destination_airports").upsert(
    airports.map((a, idx) => ({
      destination_id: destinationId,
      airport_iata: a.iata_code,
      distance_km: a.distance_km,
      priority: idx === 0 ? 1 : 2,
    })),
    { onConflict: "destination_id,airport_iata" },
  );
}

export async function getOrFindDestinationAirports({
  destinationId,
  center,
  bbox,
  destinationLabel,
}: {
  destinationId: string;
  center: GeoPoint;
  bbox: BoundingBox;
  destinationLabel?: string | null;
}): Promise<DestinationAirport[]> {
  const supabase = createAdminClient();
  const island = resolveIslandBoundaryForSearch(destinationLabel, center);

  const { data: cached } = await supabase
    .from("destination_airports")
    .select(
      `
      airport_iata,
      distance_km,
      priority,
      airport:airports (*)
    `,
    )
    .eq("destination_id", destinationId)
    .order("priority", { ascending: true });

  if (cached && cached.length > 0) {
    const mapped = cached.map((c) => {
      const airport = c.airport as unknown as AirportRow;
      return {
        iata_code: airport.iata_code,
        name: airport.name,
        city: airport.city,
        country_code: airport.country_code,
        lat: Number(airport.lat),
        lon: Number(airport.lon),
        airport_type: airport.airport_type,
        distance_km: Number(c.distance_km),
        priority: c.priority,
      };
    });

    if (island) {
      const valid = filterAirportsToIsland(mapped, island);
      if (valid.length > 0) return valid;
    } else {
      return mapped;
    }
  }

  const airports = await findAirportsForDestination({
    center,
    bbox,
    destinationLabel,
  });
  if (airports.length > 0) {
    await persistDestinationAirports(destinationId, airports);
  }
  return airports;
}

export type FlightSearchAirportPlan = {
  /** Lotniska na wyspie — pokazywane użytkownikowi. */
  localAirports: DestinationAirport[];
  /** Kody IATA używane w zapytaniu do Travelpayouts. */
  searchDestinations: string[];
  /** Międzynarodowe huby (np. TFS dla El Hierro). */
  gatewayAirports: string[];
};

/** Łączy lokalne lotnisko wyspy z hubami międzynarodowymi do wyszukiwania lotów z PL. */
export function resolveFlightSearchAirports(
  destinationLabel: string | null | undefined,
  center: GeoPoint,
  localAirports: DestinationAirport[],
): FlightSearchAirportPlan {
  const island = resolveIslandBoundaryForSearch(destinationLabel, center);
  const gatewayAirports = island?.gatewayAirports ?? [];
  const localIatas = localAirports.map((a) => a.iata_code);

  const searchDestinations =
    gatewayAirports.length > 0
      ? [...new Set([...gatewayAirports, ...localIatas])]
      : localIatas;

  return {
    localAirports,
    searchDestinations,
    gatewayAirports,
  };
}

async function queryAirportsInBBox(
  supabase: ReturnType<typeof createAdminClient>,
  queryBbox: BoundingBox,
): Promise<AirportRow[]> {
  const { data } = await supabase
    .from("airports")
    .select("*")
    .gte("lat", queryBbox.south)
    .lte("lat", queryBbox.north)
    .gte("lon", queryBbox.west)
    .lte("lon", queryBbox.east)
    .eq("scheduled_service", true)
    .limit(50);
  return data ?? [];
}

function toDestinationAirport(
  a: AirportRow,
  center: GeoPoint,
): DestinationAirport {
  const lat = Number(a.lat);
  const lon = Number(a.lon);
  return {
    iata_code: a.iata_code,
    name: a.name,
    city: a.city,
    country_code: a.country_code,
    lat,
    lon,
    airport_type: a.airport_type,
    distance_km: distanceKm(center, { lat, lon }),
    priority:
      a.airport_type === "large" ? 1 : a.airport_type === "medium" ? 2 : 3,
  };
}
