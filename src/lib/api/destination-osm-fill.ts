import {
  fetchOsmPlaces,
  persistOsmPlaces,
  type OsmCategory,
} from "@/lib/api/osm";
import { tagAttractionsWithActivitiesForIds } from "@/lib/api/osm-global-scrape";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  pointInIslandBbox,
  resolveIslandBoundary,
} from "@/lib/destinations/island-boundary";
import { distanceKm } from "@/lib/search/geo-clustering";
import type { BoundingBox } from "@/types/domain";

const ACTIVITY_TO_OSM_CATEGORIES: Record<string, OsmCategory[]> = {
  zoo: ["zoo", "aquarium"],
  aquarium: ["aquarium", "zoo"],
  theme_parks: ["theme_park"],
  museums: ["museum"],
  viewpoints: ["viewpoint"],
  caves: ["cave"],
  waterfalls: ["waterfall"],
  sandy_beaches: ["beach"],
  rocky_beaches: ["beach"],
  hiking_trails: ["hiking"],
  bike_rental: ["bicycle_rental"],
  national_parks: ["hiking", "tourism_attraction"],
  kayaking: ["tourism_attraction"],
  snorkeling: ["tourism_attraction"],
  diving: ["tourism_attraction"],
  castles: ["castle"],
  archaeology: ["archaeological_site"],
  old_towns: ["tourism_attraction"],
  canyons: ["viewpoint", "hiking"],
};

const DEFAULT_FILL_CATEGORIES: OsmCategory[] = [
  "zoo",
  "aquarium",
  "museum",
  "theme_park",
  "viewpoint",
  "beach",
  "tourism_attraction",
  "cave",
  "waterfall",
  "hiking",
  "bicycle_rental",
  "castle",
  "archaeological_site",
];

/** Szybki scrape przy wyszukiwaniu — max 6 zapytań Overpass zamiast 13+. */
export const QUICK_OSM_FILL_CATEGORIES: OsmCategory[] = [
  "beach",
  "viewpoint",
  "museum",
  "tourism_attraction",
  "archaeological_site",
  "castle",
];

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

function categoriesForActivities(activitySlugs: string[]): OsmCategory[] {
  const set = new Set<OsmCategory>();
  for (const slug of activitySlugs) {
    for (const cat of ACTIVITY_TO_OSM_CATEGORIES[slug] ?? []) {
      set.add(cat);
    }
  }
  if (set.size === 0) {
    for (const cat of DEFAULT_FILL_CATEGORIES) set.add(cat);
  }
  return [...set];
}

export async function fillDestinationAttractionsFromOsm({
  lat,
  lon,
  radiusKm,
  activitySlugs,
  searchBbox,
  forceRefresh = false,
  categoriesOverride,
}: {
  lat: number;
  lon: number;
  radiusKm: number;
  activitySlugs: string[];
  searchBbox?: BoundingBox;
  forceRefresh?: boolean;
  categoriesOverride?: OsmCategory[];
}): Promise<{ persisted: number; tagged: number }> {
  const bbox = searchBbox ?? bboxFromCenter(lat, lon, radiusKm);
  const categories = categoriesOverride ?? categoriesForActivities(activitySlugs);
  const bboxSpan =
    Math.abs(bbox.north - bbox.south) + Math.abs(bbox.east - bbox.west);
  const categoryDelayMs =
    categories.length <= 6 ? 350 : bboxSpan > 3 ? 700 : 400;

  const seen = new Set<string>();
  const allPlaces = [];

  for (const category of categories) {
    try {
      const places = await fetchOsmPlaces({ bbox, category, forceRefresh });
      for (const place of places) {
        if (seen.has(place.external_id)) continue;
        seen.add(place.external_id);
        allPlaces.push(place);
      }
    } catch {
      /* pojedyncza kategoria — kontynuuj */
    }
    await sleep(categoryDelayMs);
  }

  const { upserted } = await persistOsmPlaces(allPlaces, null);
  if (upserted === 0) return { persisted: 0, tagged: 0 };

  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("attractions")
    .select("id")
    .gte("lat", bbox.south)
    .lte("lat", bbox.north)
    .gte("lon", bbox.west)
    .lte("lon", bbox.east);

  const ids = rows?.map((r) => r.id) ?? [];
  const { tags_created } = await tagAttractionsWithActivitiesForIds(ids);

  return { persisted: upserted, tagged: tags_created };
}

const ACTIVITY_QUICK_CATEGORIES: Partial<Record<string, OsmCategory[]>> = {
  sandy_beaches: ["beach"],
  rocky_beaches: ["beach"],
  museums: ["museum"],
  viewpoints: ["viewpoint"],
  archaeology: ["archaeological_site"],
  castles: ["castle"],
  caves: ["cave"],
  waterfalls: ["waterfall"],
  hiking_trails: ["hiking"],
  zoo: ["zoo"],
  aquarium: ["aquarium"],
  theme_parks: ["theme_park"],
};

/** Szybki scrape — 6–8 kategorii zamiast pełnej listy (timeout na wyspach). */
export async function fillDestinationAttractionsQuick(
  params: {
    lat: number;
    lon: number;
    radiusKm: number;
    activitySlugs: string[];
    searchBbox?: BoundingBox;
    forceRefresh?: boolean;
  },
): Promise<{ persisted: number; tagged: number }> {
  const extra = new Set<OsmCategory>();
  for (const slug of params.activitySlugs) {
    for (const cat of ACTIVITY_QUICK_CATEGORIES[slug] ?? []) {
      extra.add(cat);
    }
  }
  const categories = [
    ...new Set([...QUICK_OSM_FILL_CATEGORIES, ...extra]),
  ].slice(0, 8);

  return fillDestinationAttractionsFromOsm({
    ...params,
    categoriesOverride: categories,
  });
}

export async function countActivitiesNearPoint({
  lat,
  lon,
  radiusKm,
  destinationLabel,
}: {
  lat: number;
  lon: number;
  radiusKm: number;
  destinationLabel?: string;
}): Promise<Record<string, number>> {
  try {
    const supabase = createAdminClient();
  const island = resolveIslandBoundary(destinationLabel);
  const center = { lat, lon };
  const effectiveRadius = island
    ? Math.min(radiusKm, island.maxRadiusKm)
    : radiusKm;
  const bbox = island?.bbox ?? bboxFromCenter(lat, lon, effectiveRadius);

  const { count: headCount } = await supabase
    .from("attractions")
    .select("*", { count: "exact", head: true })
    .gte("lat", bbox.south)
    .lte("lat", bbox.north)
    .gte("lon", bbox.west)
    .lte("lon", bbox.east);

  if (!headCount || headCount === 0) {
    return {};
  }

  const { data: attractions } = await supabase
    .from("attractions")
    .select("id, lat, lon")
    .gte("lat", bbox.south)
    .lte("lat", bbox.north)
    .gte("lon", bbox.west)
    .lte("lon", bbox.east);

  if (!attractions?.length) {
    return {};
  }

  const ids = attractions
    .filter((a) => {
      const point = { lat: Number(a.lat), lon: Number(a.lon) };
      if (island && !pointInIslandBbox(point, island.bbox)) return false;
      return distanceKm(center, point) <= effectiveRadius;
    })
    .map((a) => a.id);

  if (ids.length === 0) return {};

  const counts: Record<string, number> = {};

  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data: tags } = await supabase
      .from("attraction_activity_tags")
      .select("activity_slug")
      .in("attraction_id", chunk);

    for (const row of tags ?? []) {
      counts[row.activity_slug] = (counts[row.activity_slug] ?? 0) + 1;
    }
  }

  return counts;
  } catch {
    return {};
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
