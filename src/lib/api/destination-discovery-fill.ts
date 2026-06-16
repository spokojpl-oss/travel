import { apiEnv } from "@/config/api-env";
import { fillDestinationAttractionsFromGoogle } from "@/lib/api/destination-google-fill";
import { fillDestinationAttractionsFromOsm } from "@/lib/api/destination-osm-fill";
import {
  resolveIslandBoundaryForSearch,
  type IslandBoundary,
} from "@/lib/destinations/island-boundary";
import type { BoundingBox } from "@/types/domain";

/** Aktywności priorytetowe na kroku „Poznaj destynację” — szybkie, sensowne dla większości wyjazdów. */
export const DISCOVERY_PRIORITY_SLUGS = [
  "sandy_beaches",
  "viewpoints",
  "boat_tour",
  "museums",
  "archaeology",
  "old_towns",
  "snorkeling",
  "kayaking",
  "hiking_trails",
  "castles",
  "waterfalls",
  "diving",
  "bike_rental",
  "museums",
] as const;

const UNIQUE_DISCOVERY_SLUGS = [...new Set(DISCOVERY_PRIORITY_SLUGS)];

function bboxFromCenter(
  lat: number,
  lon: number,
  radiusKm: number,
): BoundingBox {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lon + lonDelta,
    west: lon - lonDelta,
  };
}

export type DiscoveryFillResult = {
  osmPersisted: number;
  googlePersisted: number;
  island: IslandBoundary | null;
};

/**
 * Szybkie uzupełnienie atrakcji pod krok discovery — OSM (zawsze) + Google (jeśli klucz).
 * Używa bbox wyspy gdy znana, żeby nie szukać poza destynacją.
 */
export async function fillForDestinationDiscovery({
  lat,
  lon,
  radiusKm,
  destinationLabel,
}: {
  lat: number;
  lon: number;
  radiusKm: number;
  destinationLabel?: string;
}): Promise<DiscoveryFillResult> {
  const island = resolveIslandBoundaryForSearch(destinationLabel, { lat, lon });
  const searchBbox = island?.bbox ?? bboxFromCenter(lat, lon, radiusKm);
  const effectiveRadius = island
    ? Math.min(radiusKm, island.maxRadiusKm)
    : Math.min(radiusKm, 70);

  const osm = await fillDestinationAttractionsFromOsm({
    lat,
    lon,
    radiusKm: effectiveRadius,
    activitySlugs: [...UNIQUE_DISCOVERY_SLUGS],
    searchBbox,
    forceRefresh: false,
  }).catch(() => ({ persisted: 0, tagged: 0 }));

  let googlePersisted = 0;
  if (apiEnv.GOOGLE_PLACES_API_KEY) {
    const google = await fillDestinationAttractionsFromGoogle({
      lat,
      lon,
      radiusKm: effectiveRadius,
      activitySlugs: [...UNIQUE_DISCOVERY_SLUGS],
      onlySlugs: [...UNIQUE_DISCOVERY_SLUGS],
      destinationLabel,
      searchBbox,
      islandBbox: island?.bbox,
      maxConcurrent: 6,
    }).catch(() => ({ persisted: 0, tagged: 0 }));
    googlePersisted = google.persisted;
  }

  return {
    osmPersisted: osm.persisted,
    googlePersisted,
    island,
  };
}
