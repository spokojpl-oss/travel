import { createAdminClient } from "@/lib/supabase/admin";
import { clusterAttractions } from "./geo-clustering";
import type {
  ActivitySearchQuery,
  ActivitySearchResult,
  Attraction,
  AttractionWithActivities,
} from "@/types/domain";

const MAX_ATTRACTIONS_FROM_DB = 5000;

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
    .limit(MAX_ATTRACTIONS_FROM_DB);

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

  const attractions = Array.from(attractionMap.values());

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

  return {
    query,
    clusters: topClusters,
    total_attractions_considered: attractions.length,
    duration_ms: Date.now() - startTime,
  };
}
