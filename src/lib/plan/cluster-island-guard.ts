import { resolveIslandBoundaryForSearch, pointInIslandBbox, resolveIslandBoundaryAtPoint } from "@/lib/destinations/island-boundary";
import { distanceKm } from "@/lib/search/geo-clustering";
import type { AttractionWithActivities, GeoCluster, GeoPoint } from "@/types/domain";

function normalizeIslandKey(name: string): string {
  return name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function computeCentroid(attractions: AttractionWithActivities[]): GeoPoint {
  if (attractions.length === 0) return { lat: 0, lon: 0 };
  const lat = attractions.reduce((s, a) => s + Number(a.lat), 0) / attractions.length;
  const lon = attractions.reduce((s, a) => s + Number(a.lon), 0) / attractions.length;
  return { lat, lon };
}

export function filterAttractionsToDestinationIsland(
  attractions: AttractionWithActivities[],
  destinationLabel: string | null | undefined,
  near?: GeoPoint | null,
): AttractionWithActivities[] {
  const island = resolveIslandBoundaryForSearch(destinationLabel, near ?? null);
  if (!island) return attractions;

  return attractions.filter((a) =>
    pointInIslandBbox({ lat: Number(a.lat), lon: Number(a.lon) }, island.bbox),
  );
}

export function settlementCoordsOnWrongIsland(
  settlement: GeoPoint,
  destinationLabel: string | null | undefined,
): boolean {
  const target = resolveIslandBoundaryForSearch(destinationLabel, settlement);
  const atSettlement = resolveIslandBoundaryAtPoint(settlement.lat, settlement.lon);
  if (!target || !atSettlement) return false;
  return normalizeIslandKey(target.name) !== normalizeIslandKey(atSettlement.name);
}

/** Usuwa atrakcje z innej wyspy i resetuje błędną bazę (np. Yaiza przy plażach Fuerteventury). */
export function sanitizeClusterForDestination(
  cluster: GeoCluster,
  destinationLabel: string | null | undefined,
): GeoCluster {
  const near = cluster.center;
  const onIsland = filterAttractionsToDestinationIsland(
    cluster.attractions,
    destinationLabel,
    near,
  );

  if (onIsland.length === 0) return cluster;

  const centroid = computeCentroid(onIsland);
  let settlement = cluster.settlement;

  if (
    settlement &&
    (settlementCoordsOnWrongIsland(settlement, destinationLabel) ||
      distanceKm(settlement, centroid) > Math.max(cluster.radius_km * 1.5, 35))
  ) {
    settlement = undefined;
  }

  const center = settlement
    ? { lat: settlement.lat, lon: settlement.lon }
    : centroid;

  const radius_km = Math.max(
    ...onIsland.map((a) => distanceKm(center, { lat: Number(a.lat), lon: Number(a.lon) })),
    0.5,
  );

  return {
    ...cluster,
    center,
    settlement,
    radius_km: Math.round(radius_km * 10) / 10,
    attractions: [...onIsland].sort(
      (a, b) =>
        distanceKm(center, { lat: Number(a.lat), lon: Number(a.lon) }) -
        distanceKm(center, { lat: Number(b.lat), lon: Number(b.lon) }),
    ),
  };
}

export function buildClusterFromAttractions({
  attractions,
  destinationLabel,
  id = "plan",
}: {
  attractions: AttractionWithActivities[];
  destinationLabel?: string | null;
  id?: string;
}): GeoCluster | null {
  const filtered = filterAttractionsToDestinationIsland(
    attractions,
    destinationLabel ?? null,
  );
  if (filtered.length === 0) return null;

  const center = computeCentroid(filtered);
  const activity_counts: Record<string, number> = {};
  for (const a of filtered) {
    for (const tag of a.activity_tags) {
      activity_counts[tag.activity_slug] =
        (activity_counts[tag.activity_slug] ?? 0) + 1;
    }
  }

  const radius_km = Math.max(
    ...filtered.map((a) =>
      distanceKm(center, { lat: Number(a.lat), lon: Number(a.lon) }),
    ),
    0.5,
  );

  return {
    id,
    center,
    bbox: {
      north: Math.max(...filtered.map((a) => Number(a.lat))),
      south: Math.min(...filtered.map((a) => Number(a.lat))),
      east: Math.max(...filtered.map((a) => Number(a.lon))),
      west: Math.min(...filtered.map((a) => Number(a.lon))),
    },
    radius_km: Math.round(radius_km * 10) / 10,
    attractions: filtered,
    covered_activities: Object.keys(activity_counts),
    score: 1,
    activity_counts,
  };
}
