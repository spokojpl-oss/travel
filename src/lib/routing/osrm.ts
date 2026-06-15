import { distanceKm } from "@/lib/search/geo-clustering";
import type { GeoPoint } from "@/types/domain";

export type DrivingRoute = {
  distance_km: number;
  duration_min: number;
  geometry: Array<[number, number]>;
  source: "osrm" | "straight";
};

type OsrmRouteResponse = {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: {
      coordinates: Array<[number, number]>;
    };
  }>;
  code?: string;
};

function straightLineRoute(from: GeoPoint, to: GeoPoint): DrivingRoute {
  const km = distanceKm(from, to);
  return {
    distance_km: Math.round(km * 10) / 10,
    duration_min: Math.max(1, Math.round((km / 60) * 60)),
    geometry: [
      [from.lat, from.lon],
      [to.lat, to.lon],
    ],
    source: "straight",
  };
}

export async function fetchDrivingRoute(
  from: GeoPoint,
  to: GeoPoint,
): Promise<DrivingRoute> {
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return straightLineRoute(from, to);
    }

    const data = (await response.json()) as OsrmRouteResponse;
    const route = data.routes?.[0];
    if (!route?.geometry?.coordinates?.length) {
      return straightLineRoute(from, to);
    }

    return {
      distance_km: Math.round((route.distance / 1000) * 10) / 10,
      duration_min: Math.max(1, Math.round(route.duration / 60)),
      geometry: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
      source: "osrm",
    };
  } catch {
    return straightLineRoute(from, to);
  }
}

export async function fetchDrivingRoutes(
  segments: Array<{ id: string; from: GeoPoint; to: GeoPoint }>,
): Promise<Array<{ id: string; route: DrivingRoute }>> {
  const results = await Promise.all(
    segments.map(async (segment) => ({
      id: segment.id,
      route: await fetchDrivingRoute(segment.from, segment.to),
    })),
  );
  return results;
}

export function googleMapsDirectionsUrl(from: GeoPoint, to: GeoPoint): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${from.lat},${from.lon}`,
    destination: `${to.lat},${to.lon}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function googleMapsPlaceUrl(point: GeoPoint, label?: string): string {
  const params = new URLSearchParams({
    api: "1",
    query: label ? `${label}@${point.lat},${point.lon}` : `${point.lat},${point.lon}`,
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}
