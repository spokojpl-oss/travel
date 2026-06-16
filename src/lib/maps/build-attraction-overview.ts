import type {
  AttractionWithActivities,
  BoundingBox,
  GeoCluster,
} from "@/types/domain";
import type { ActivitySearchResult } from "@/types/domain";

export type AttractionMapOverview = NonNullable<
  ActivitySearchResult["island_overview"]
>;

export function mergeClusterAttractions(
  clusters: GeoCluster[],
): AttractionWithActivities[] {
  const byId = new Map<string, AttractionWithActivities>();
  for (const cluster of clusters) {
    for (const attraction of cluster.attractions) {
      if (!byId.has(attraction.id)) {
        byId.set(attraction.id, attraction);
      }
    }
  }
  return [...byId.values()];
}

function bboxFromAttractions(
  attractions: AttractionWithActivities[],
): BoundingBox {
  if (attractions.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 };
  }

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const a of attractions) {
    const lat = Number(a.lat);
    const lon = Number(a.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    north = Math.max(north, lat);
    south = Math.min(south, lat);
    east = Math.max(east, lon);
    west = Math.min(west, lon);
  }

  const pad = 0.06;
  return {
    north: north + pad,
    south: south - pad,
    east: east + pad,
    west: west - pad,
  };
}

function activityCountsFor(
  attractions: AttractionWithActivities[],
  activitySlugs: string[],
): Record<string, number> {
  const slugSet = new Set(activitySlugs);
  const counts: Record<string, number> = {};

  for (const a of attractions) {
    for (const tag of a.activity_tags) {
      if (!slugSet.has(tag.activity_slug)) continue;
      counts[tag.activity_slug] = (counts[tag.activity_slug] ?? 0) + 1;
    }
  }

  return counts;
}

export function buildAttractionOverviewFromClusters(
  clusters: GeoCluster[],
  options: {
    name: string;
    selectedActivities: string[];
    airports?: AttractionMapOverview["airports"];
  },
): AttractionMapOverview | null {
  const attractions = mergeClusterAttractions(clusters);
  if (attractions.length === 0) return null;

  return {
    island_name: options.name,
    attractions,
    activity_counts: activityCountsFor(
      attractions,
      options.selectedActivities,
    ),
    airports: options.airports ?? [],
    bbox: bboxFromAttractions(attractions),
  };
}
