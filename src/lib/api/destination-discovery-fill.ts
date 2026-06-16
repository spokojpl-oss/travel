import {
  fillDestinationAttractionsQuick,
} from "@/lib/api/destination-osm-fill";
import {
  resolveIslandBoundaryForSearch,
  type IslandBoundary,
} from "@/lib/destinations/island-boundary";

export type DiscoveryFillResult = {
  osmPersisted: number;
  googlePersisted: number;
  island: IslandBoundary | null;
};

/**
 * Lekkie uzupełnienie w tle — tylko szybki OSM, bez Google (discovery musi być szybkie).
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
  const searchBbox = island?.bbox;
  const effectiveRadius = island
    ? Math.min(radiusKm, island.maxRadiusKm)
    : Math.min(radiusKm, 70);

  const osm = await fillDestinationAttractionsQuick({
    lat,
    lon,
    radiusKm: effectiveRadius,
    activitySlugs: [
      "sandy_beaches",
      "viewpoints",
      "museums",
      "archaeology",
      "old_towns",
    ],
    searchBbox,
  }).catch(() => ({ persisted: 0, tagged: 0 }));

  return {
    osmPersisted: osm.persisted,
    googlePersisted: 0,
    island,
  };
}
