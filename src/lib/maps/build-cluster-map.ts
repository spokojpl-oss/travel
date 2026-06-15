import { distanceKm } from "@/lib/search/geo-clustering";
import type { GeoCluster } from "@/types/domain";
import type { MapPoint, MapRouteSegment } from "@/lib/maps/types";

export function buildClusterMapData(cluster: GeoCluster): {
  points: MapPoint[];
  segments: MapRouteSegment[];
} {
  const center = cluster.center;
  const attractions = cluster.attractions.slice(0, 8);
  const maxDistKm =
    attractions.length > 0
      ? Math.max(
          ...attractions.map((a) =>
            distanceKm(center, { lat: Number(a.lat), lon: Number(a.lon) }),
          ),
        )
      : 0;

  const points: MapPoint[] = [
    {
      id: "centroid",
      type: "centroid",
      label: "Centrum regionu",
      lat: center.lat,
      lon: center.lon,
      badge:
        maxDistKm > 0
          ? `Rozpiętość: ${maxDistKm.toFixed(1)} km (linia prosta)`
          : undefined,
    },
    ...attractions.map((a) => ({
      id: a.id,
      type: "attraction" as const,
      label: a.name.length > 28 ? `${a.name.slice(0, 28)}…` : a.name,
      lat: Number(a.lat),
      lon: Number(a.lon),
      badge: `${distanceKm(center, { lat: Number(a.lat), lon: Number(a.lon) }).toFixed(1)} km (linia prosta)`,
    })),
  ];

  const segments: MapRouteSegment[] = attractions.map((a) => ({
    id: `centroid-${a.id}`,
    from: "centroid",
    to: a.id,
    fromLat: center.lat,
    fromLon: center.lon,
    toLat: Number(a.lat),
    toLon: Number(a.lon),
  }));

  return { points, segments };
}
