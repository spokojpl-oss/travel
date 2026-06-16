import { distanceKm } from "@/lib/search/geo-clustering";
import { clusterDisplayName } from "@/lib/search/settlement-resolver";
import type { GeoCluster } from "@/types/domain";
import type { MapPoint, MapRouteSegment } from "@/lib/maps/types";
import type { IslandMapAirport } from "@/lib/maps/build-island-map";

export function buildClusterMapData(
  cluster: GeoCluster,
  airports: IslandMapAirport[] = [],
): {
  points: MapPoint[];
  segments: MapRouteSegment[];
} {
  const center = cluster.center;
  const labelName = clusterDisplayName(cluster);
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
      label: cluster.settlement?.name
        ? `Baza pobytu: ${cluster.settlement.name}`
        : `Baza: ${labelName}`,
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

  const airportPoints: MapPoint[] = airports.map((airport) => ({
    id: `airport-${airport.iata_code}`,
    type: "airport" as const,
    label: `${airport.name} (${airport.iata_code})`,
    lat: airport.lat,
    lon: airport.lon,
  }));

  return { points: [...airportPoints, ...points], segments };
}
