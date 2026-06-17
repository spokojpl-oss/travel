import { buildClusterMapData } from "@/lib/maps/build-cluster-map";
import { buildClusterMapDataWithAirports } from "@/lib/maps/build-island-map";
import { cyclingRoutesToMapOverlays } from "@/lib/maps/cycling-route-overlays";
import type { MapCyclingRouteOverlay } from "@/lib/maps/cycling-route-overlays";
import type { MapPoint, MapRouteSegment } from "@/lib/maps/types";
import type { DestinationBuildPayload } from "@/lib/search/destination-build-payload";
import { distanceKm } from "@/lib/search/geo-clustering";
import type { GeoCluster } from "@/types/domain";

/** Poniżej tej odległości nie pokazujemy „jazdy samochodem” (nakładające się współrzędne). */
const MIN_DRIVE_SEGMENT_KM = 0.4;

function filterNearDuplicateSegments(segments: MapRouteSegment[]): MapRouteSegment[] {
  return segments.filter((segment) => {
    const km = distanceKm(
      { lat: segment.fromLat, lon: segment.fromLon },
      { lat: segment.toLat, lon: segment.toLon },
    );
    return km >= MIN_DRIVE_SEGMENT_KM;
  });
}

function airportSegmentsFromBase(
  center: GeoCluster["center"],
  airports: NonNullable<DestinationBuildPayload["airports"]>,
): MapRouteSegment[] {
  return airports.map((airport) => ({
    id: `centroid-airport-${airport.iata_code}`,
    from: "centroid",
    to: `airport-${airport.iata_code}`,
    fromLat: center.lat,
    fromLon: center.lon,
    toLat: airport.lat,
    toLon: airport.lon,
  }));
}

export function buildCyclingSummaryMapData(
  cluster: GeoCluster,
  payload: DestinationBuildPayload,
  locale: "pl" | "en" = "pl",
): {
  points: MapPoint[];
  segments: MapRouteSegment[];
  cyclingRoutes: MapCyclingRouteOverlay[];
} {
  const selectedIds =
    payload.selectedAttractionIds !== undefined
      ? new Set(payload.selectedAttractionIds)
      : undefined;

  const base = buildClusterMapData(cluster, [], {
    selectedIds,
    locale,
  });

  const withAirports = buildClusterMapDataWithAirports(
    base,
    payload.airports ?? [],
  );

  const attractionSegments = filterNearDuplicateSegments(withAirports.segments);
  const airportSegments = filterNearDuplicateSegments(
    airportSegmentsFromBase(cluster.center, payload.airports ?? []),
  );

  const cyclingRoutes = cyclingRoutesToMapOverlays(
    payload.selectedCyclingRoutes ?? [],
  );

  return {
    points: withAirports.points,
    segments: [...attractionSegments, ...airportSegments],
    cyclingRoutes,
  };
}
