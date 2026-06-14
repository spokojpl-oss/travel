import { distanceKm } from "@/lib/search/geo-clustering";
import type { GeoPoint } from "@/types/domain";

export type HotelProximity = {
  hotel_id: string;
  avg_distance_km: number;
  closest_attraction: { name: string; distance_km: number };
  farthest_attraction: { name: string; distance_km: number };
  per_attraction: Array<{
    attraction_id: string;
    name: string;
    distance_km: number;
  }>;
};

export type AttractionWithLocation = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

export function calculateProximity({
  hotels,
  attractions,
}: {
  hotels: Array<{ id: string; lat: number; lon: number }>;
  attractions: AttractionWithLocation[];
}): Map<string, HotelProximity> {
  const proximityMap = new Map<string, HotelProximity>();

  if (attractions.length === 0) {
    return proximityMap;
  }

  for (const hotel of hotels) {
    const hotelPoint: GeoPoint = { lat: hotel.lat, lon: hotel.lon };

    const distances = attractions.map((a) => ({
      attraction_id: a.id,
      name: a.name,
      distance_km: round(distanceKm(hotelPoint, { lat: a.lat, lon: a.lon }), 2),
    }));

    distances.sort((a, b) => a.distance_km - b.distance_km);

    const avgDistance = round(
      distances.reduce((s, d) => s + d.distance_km, 0) / distances.length,
      2,
    );

    proximityMap.set(hotel.id, {
      hotel_id: hotel.id,
      avg_distance_km: avgDistance,
      closest_attraction: {
        name: distances[0].name,
        distance_km: distances[0].distance_km,
      },
      farthest_attraction: {
        name: distances[distances.length - 1].name,
        distance_km: distances[distances.length - 1].distance_km,
      },
      per_attraction: distances,
    });
  }

  return proximityMap;
}

export function computeAttractionsCentroid(
  attractions: AttractionWithLocation[],
): GeoPoint | null {
  if (attractions.length === 0) return null;
  const sumLat = attractions.reduce((s, a) => s + a.lat, 0);
  const sumLon = attractions.reduce((s, a) => s + a.lon, 0);
  return {
    lat: sumLat / attractions.length,
    lon: sumLon / attractions.length,
  };
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
