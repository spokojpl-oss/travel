import { createAdminClient } from "@/lib/supabase/admin";
import { distanceKm } from "@/lib/search/geo-clustering";
import type { BoundingBox, GeoPoint } from "@/types/domain";
import type { Database } from "@/types/database";

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
  maxDistanceKm = 200,
  maxResults = 5,
}: {
  center: GeoPoint;
  bbox: BoundingBox;
  maxDistanceKm?: number;
  maxResults?: number;
}): Promise<DestinationAirport[]> {
  const supabase = createAdminClient();

  const margin = 2;
  const searchBbox = {
    north: bbox.north + margin,
    south: bbox.south - margin,
    east: bbox.east + margin,
    west: bbox.west - margin,
  };

  const { data: candidates } = await supabase
    .from("airports")
    .select("*")
    .gte("lat", searchBbox.south)
    .lte("lat", searchBbox.north)
    .gte("lon", searchBbox.west)
    .lte("lon", searchBbox.east)
    .eq("scheduled_service", true)
    .limit(50);

  if (!candidates || candidates.length === 0) return [];

  return candidates
    .map((a) => toDestinationAirport(a, center))
    .filter((a) => a.distance_km <= maxDistanceKm)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.distance_km - b.distance_km;
    })
    .slice(0, maxResults);
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
}: {
  destinationId: string;
  center: GeoPoint;
  bbox: BoundingBox;
}): Promise<DestinationAirport[]> {
  const supabase = createAdminClient();

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
    return cached.map((c) => {
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
  }

  const airports = await findAirportsForDestination({ center, bbox });
  await persistDestinationAirports(destinationId, airports);
  return airports;
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
