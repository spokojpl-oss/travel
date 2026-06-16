import { distanceKm } from "@/lib/search/geo-clustering";
import { toPolishAttractionName } from "@/lib/plan/attraction-display-name";
import {
  isDayTripAttraction,
  readPlanMeta,
} from "@/lib/plan/plan-attraction-meta";
import type { GeoCluster } from "@/types/domain";
import type { MapPoint, MapRouteSegment } from "@/lib/maps/types";
import type { IslandMapAirport } from "@/lib/maps/build-island-map";

export function buildClusterMapData(
  cluster: GeoCluster,
  airports: IslandMapAirport[] = [],
  options?: {
    selectedIds?: Set<string>;
    locale?: "pl" | "en";
    maxAttractions?: number;
    attractionPool?: GeoCluster["attractions"];
  },
): {
  points: MapPoint[];
  segments: MapRouteSegment[];
} {
  const center = cluster.center;
  const locale = options?.locale ?? "pl";
  const baseName =
    cluster.settlement?.name ??
    (locale === "en" ? "Lodging base" : "Baza noclegowa");

  let attractions = cluster.attractions;
  if (options?.selectedIds && options.selectedIds.size > 0) {
    attractions = attractions.filter((a) => options.selectedIds!.has(a.id));
  }

  const limit = options?.maxAttractions ?? attractions.length;
  const plotted = attractions.slice(0, limit);

  const maxDistKm =
    plotted.length > 0
      ? Math.max(
          ...plotted.map((a) =>
            distanceKm(center, { lat: Number(a.lat), lon: Number(a.lon) }),
          ),
        )
      : 0;

  const points: MapPoint[] = [
    {
      id: "centroid",
      type: "centroid",
      label:
        locale === "en"
          ? `Lodging base: ${baseName}`
          : `Baza noclegowa: ${baseName}`,
      lat: center.lat,
      lon: center.lon,
      badge:
        maxDistKm > 0
          ? locale === "en"
            ? `Spread: ${maxDistKm.toFixed(1)} km (straight line)`
            : `Rozpiętość: ${maxDistKm.toFixed(1)} km (linia prosta)`
          : undefined,
    },
    ...plotted.map((a) => {
      const dist = distanceKm(center, {
        lat: Number(a.lat),
        lon: Number(a.lon),
      });
      const meta = readPlanMeta(a);
      const driveMin = meta?.drive_minutes;
      const badge =
        isDayTripAttraction(a) && driveMin
          ? locale === "en"
            ? `~${driveMin} min drive`
            : `~${driveMin} min jazdy`
          : `${dist.toFixed(1)} km`;
      return {
        id: a.id,
        type: "attraction" as const,
        label: toPolishAttractionName(a.name, locale),
        lat: Number(a.lat),
        lon: Number(a.lon),
        badge,
      };
    }),
  ];

  const segments: MapRouteSegment[] = plotted.map((a) => ({
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
