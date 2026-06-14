import { createAdminClient } from "@/lib/supabase/admin";
import { clusterAttractions, distanceKm } from "./geo-clustering";
import type {
  ActivitySearchQuery,
  ActivitySearchResult,
  Attraction,
  AttractionWithActivities,
} from "@/types/domain";

const MAX_TAG_ROWS = 8000;
const MAX_ATTRACTIONS_TO_CLUSTER = 1200;

type TagRow = {
  attraction_id: string;
  activity_slug: string;
  confidence: number;
  attraction: Attraction | null;
};

function normalizeAttraction(attraction: Attraction): AttractionWithActivities {
  return {
    ...attraction,
    lat: Number(attraction.lat),
    lon: Number(attraction.lon),
    activity_tags: [],
  };
}

function hasNearPoint(query: ActivitySearchQuery): query is ActivitySearchQuery & {
  near_lat: number;
  near_lon: number;
} {
  return (
    query.near_lat != null &&
    query.near_lon != null &&
    Number.isFinite(query.near_lat) &&
    Number.isFinite(query.near_lon)
  );
}

export async function searchActivities(
  query: ActivitySearchQuery,
): Promise<ActivitySearchResult> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  const { data: tagRows } = await supabase
    .from("attraction_activity_tags")
    .select(
      `
      attraction_id,
      activity_slug,
      confidence,
      attraction:attractions (
        id,
        name,
        description,
        category,
        subcategories,
        lat,
        lon,
        address,
        phone,
        website,
        opening_hours,
        tags,
        min_age,
        duration_minutes,
        destination_id,
        source,
        external_id,
        created_at,
        updated_at
      )
    `,
    )
    .in("activity_slug", query.activities)
    .limit(MAX_TAG_ROWS);

  if (!tagRows || tagRows.length === 0) {
    return {
      query,
      clusters: [],
      total_attractions_considered: 0,
      duration_ms: Date.now() - startTime,
    };
  }

  const attractionMap = new Map<string, AttractionWithActivities>();

  for (const row of tagRows as TagRow[]) {
    if (!row.attraction) continue;

    const existing = attractionMap.get(row.attraction.id);
    if (existing) {
      existing.activity_tags.push({
        activity_slug: row.activity_slug,
        confidence: Number(row.confidence),
      });
    } else {
      attractionMap.set(row.attraction.id, {
        ...normalizeAttraction(row.attraction),
        activity_tags: [
          {
            activity_slug: row.activity_slug,
            confidence: Number(row.confidence),
          },
        ],
      });
    }
  }

  let attractions = Array.from(attractionMap.values());

  if (hasNearPoint(query)) {
    const center = { lat: query.near_lat, lon: query.near_lon };
    const radius = query.near_radius_km ?? 150;
    attractions = attractions.filter(
      (a) => distanceKm(center, { lat: a.lat, lon: a.lon }) <= radius,
    );
  } else if (attractions.length > MAX_ATTRACTIONS_TO_CLUSTER) {
    attractions = attractions.slice(0, MAX_ATTRACTIONS_TO_CLUSTER);
  }

  if (attractions.length === 0) {
    return {
      query,
      clusters: [],
      total_attractions_considered: 0,
      duration_ms: Date.now() - startTime,
    };
  }

  const clusters = clusterAttractions({
    attractions,
    selectedActivities: query.activities,
    matchMode: query.match_mode,
    maxRadiusKm: query.max_radius_km,
    minPerActivity: query.min_per_activity,
  });

  const topClusters = clusters.slice(0, 10).map((cluster) => ({
    ...cluster,
    attractions: cluster.attractions.slice(0, 20),
  }));

  let filtered = topClusters;
  if (hasNearPoint(query)) {
    const center = { lat: query.near_lat, lon: query.near_lon };
    const radius = query.near_radius_km ?? 200;
    filtered = topClusters
      .map((cluster) => ({
        cluster,
        dist: distanceKm(cluster.center, center),
      }))
      .filter((x) => x.dist <= radius)
      .sort((a, b) => a.dist - b.dist)
      .map((x) => x.cluster);
  }

  return {
    query,
    clusters: filtered,
    total_attractions_considered: attractions.length,
    duration_ms: Date.now() - startTime,
  };
}
