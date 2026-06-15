import { createAdminClient } from "@/lib/supabase/admin";
import {
  countActivitiesNearPoint,
  fillDestinationAttractionsFromOsm,
} from "@/lib/api/destination-osm-fill";
import { clusterAttractions, distanceKm } from "./geo-clustering";
import {
  applyExplorationScopeToQuery,
  explorationScopeFromString,
} from "./exploration-scope";
import { enrichClusterWithSettlement } from "./settlement-resolver";
import type {
  ActivitySearchQuery,
  ActivitySearchResult,
  Attraction,
  AttractionWithActivities,
  GeoCluster,
} from "@/types/domain";

const MAX_TAG_ROWS_GLOBAL = 8000;
const MAX_ATTRACTIONS_TO_CLUSTER = 1200;
const ID_CHUNK_SIZE = 200;

const ATTRACTION_FIELDS = `
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
`;

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

function latLonBBox(lat: number, lon: number, radiusKm: number) {
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
}

async function fetchAttractionIdsNear(
  supabase: ReturnType<typeof createAdminClient>,
  center: { lat: number; lon: number },
  radiusKm: number,
): Promise<string[]> {
  const bbox = latLonBBox(center.lat, center.lon, radiusKm);
  const { data } = await supabase
    .from("attractions")
    .select("id, lat, lon")
    .gte("lat", bbox.minLat)
    .lte("lat", bbox.maxLat)
    .gte("lon", bbox.minLon)
    .lte("lon", bbox.maxLon)
    .limit(5000);

  if (!data?.length) return [];

  return data
    .filter(
      (a) =>
        distanceKm(center, { lat: Number(a.lat), lon: Number(a.lon) }) <=
        radiusKm,
    )
    .map((a) => a.id);
}

async function fetchTagRows(
  supabase: ReturnType<typeof createAdminClient>,
  activities: string[],
  attractionIds?: string[],
): Promise<TagRow[]> {
  if (attractionIds && attractionIds.length === 0) return [];

  const rows: TagRow[] = [];

  if (!attractionIds) {
    const { data } = await supabase
      .from("attraction_activity_tags")
      .select(
        `
        attraction_id,
        activity_slug,
        confidence,
        attraction:attractions (${ATTRACTION_FIELDS})
      `,
      )
      .in("activity_slug", activities)
      .limit(MAX_TAG_ROWS_GLOBAL);
    return (data as TagRow[]) ?? [];
  }

  for (let i = 0; i < attractionIds.length; i += ID_CHUNK_SIZE) {
    const chunk = attractionIds.slice(i, i + ID_CHUNK_SIZE);
    const { data } = await supabase
      .from("attraction_activity_tags")
      .select(
        `
        attraction_id,
        activity_slug,
        confidence,
        attraction:attractions (${ATTRACTION_FIELDS})
      `,
      )
      .in("activity_slug", activities)
      .in("attraction_id", chunk);

    if (data?.length) rows.push(...(data as TagRow[]));
  }

  return rows;
}

function buildAttractionMap(tagRows: TagRow[]): AttractionWithActivities[] {
  const attractionMap = new Map<string, AttractionWithActivities>();

  for (const row of tagRows) {
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

  return Array.from(attractionMap.values());
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

export async function searchActivities(
  query: ActivitySearchQuery,
): Promise<ActivitySearchResult> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  const scope = explorationScopeFromString(query.exploration_scope);
  const effectiveQuery = scope
    ? applyExplorationScopeToQuery(query, scope)
    : query;

  let tagRows: TagRow[] = [];
  let geoRadiusUsed: number | null = null;
  let attractionsInBbox = 0;
  let osmFilled = false;

  if (hasNearPoint(effectiveQuery)) {
    const center = { lat: effectiveQuery.near_lat, lon: effectiveQuery.near_lon };
    const radii = [
      effectiveQuery.near_radius_km ?? 150,
      250,
      400,
    ];

    for (const radiusKm of radii) {
      const ids = await fetchAttractionIdsNear(supabase, center, radiusKm);
      attractionsInBbox = ids.length;

      if (ids.length === 0) continue;

      tagRows = await fetchTagRows(supabase, effectiveQuery.activities, ids);
      if (tagRows.length > 0) {
        geoRadiusUsed = radiusKm;
        break;
      }
    }

    if (tagRows.length === 0) {
      try {
        await fillDestinationAttractionsFromOsm({
          lat: center.lat,
          lon: center.lon,
          radiusKm: effectiveQuery.near_radius_km ?? 120,
          activitySlugs: effectiveQuery.activities,
        });
        osmFilled = true;

        for (const radiusKm of radii) {
          const ids = await fetchAttractionIdsNear(supabase, center, radiusKm);
          attractionsInBbox = ids.length;
          if (ids.length === 0) continue;
          tagRows = await fetchTagRows(supabase, effectiveQuery.activities, ids);
          if (tagRows.length > 0) {
            geoRadiusUsed = radiusKm;
            break;
          }
        }
      } catch {
        /* OSM fill optional */
      }
    }
  } else {
    tagRows = await fetchTagRows(supabase, effectiveQuery.activities);
  }

  if (tagRows.length === 0) {
    return {
      query: effectiveQuery,
      clusters: [],
      total_attractions_considered: 0,
      duration_ms: Date.now() - startTime,
      meta: {
        tag_rows_fetched: 0,
        geo_radius_km_used: geoRadiusUsed,
        attractions_in_bbox: attractionsInBbox,
        osm_filled: osmFilled,
      },
    };
  }

  let attractions = buildAttractionMap(tagRows);

  if (!hasNearPoint(effectiveQuery) && attractions.length > MAX_ATTRACTIONS_TO_CLUSTER) {
    attractions = attractions.slice(0, MAX_ATTRACTIONS_TO_CLUSTER);
  }

  if (attractions.length === 0) {
    return {
      query: effectiveQuery,
      clusters: [],
      total_attractions_considered: 0,
      duration_ms: Date.now() - startTime,
      meta: {
        tag_rows_fetched: tagRows.length,
        geo_radius_km_used: geoRadiusUsed,
        attractions_in_bbox: attractionsInBbox,
        osm_filled: osmFilled,
      },
    };
  }

  const clusters = clusterAttractions({
    attractions,
    selectedActivities: effectiveQuery.activities,
    matchMode: effectiveQuery.match_mode,
    maxRadiusKm: effectiveQuery.max_radius_km,
    minPerActivity: effectiveQuery.min_per_activity,
  });

  const topClusters = clusters.slice(0, 10).map((cluster) => ({
    ...cluster,
    attractions: cluster.attractions.slice(0, 12),
  }));

  const enrichedClusters: GeoCluster[] = [];
  for (const cluster of topClusters) {
    enrichedClusters.push(await enrichClusterWithSettlement(cluster));
  }

  const withSettlement = enrichedClusters.filter((c) => c.settlement?.name);

  let filtered = withSettlement;
  if (hasNearPoint(effectiveQuery)) {
    const center = { lat: effectiveQuery.near_lat, lon: effectiveQuery.near_lon };
    const radius = geoRadiusUsed ?? effectiveQuery.near_radius_km ?? 200;
    filtered = withSettlement
      .map((cluster) => ({
        cluster,
        dist: distanceKm(cluster.center, center),
      }))
      .filter((x) => x.dist <= radius)
      .sort((a, b) => a.dist - b.dist)
      .map((x) => x.cluster);
  }

  return {
    query: effectiveQuery,
    clusters: filtered,
    total_attractions_considered: attractions.length,
    duration_ms: Date.now() - startTime,
    meta: {
      tag_rows_fetched: tagRows.length,
      geo_radius_km_used: geoRadiusUsed,
      attractions_in_bbox: attractionsInBbox,
      osm_filled: osmFilled,
    },
  };
}
