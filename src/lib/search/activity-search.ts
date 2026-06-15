import { createAdminClient } from "@/lib/supabase/admin";
import { fillDestinationAttractionsFromOsm } from "@/lib/api/destination-osm-fill";
import { fillDestinationAttractionsFromGoogle } from "@/lib/api/destination-google-fill";
import { ensureDestinationActivities, fillRadiusKm } from "@/lib/api/destination-activity-prefill";
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

function mergeTagRows(a: TagRow[], b: TagRow[]): TagRow[] {
  const seen = new Set<string>();
  const out: TagRow[] = [];
  for (const row of [...a, ...b]) {
    const key = `${row.attraction_id}:${row.activity_slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function missingActivities(tagRows: TagRow[], activities: string[]): string[] {
  const covered = new Set(tagRows.map((r) => r.activity_slug));
  return activities.filter((slug) => !covered.has(slug));
}

async function fetchTagRowsForRadii(
  supabase: ReturnType<typeof createAdminClient>,
  query: ActivitySearchQuery & { near_lat: number; near_lon: number },
): Promise<{
  tagRows: TagRow[];
  geoRadiusUsed: number | null;
  attractionsInBbox: number;
}> {
  const center = { lat: query.near_lat, lon: query.near_lon };
  const radii = [query.near_radius_km ?? 150, 250, 400];

  let tagRows: TagRow[] = [];
  let geoRadiusUsed: number | null = null;
  let attractionsInBbox = 0;

  for (const radiusKm of radii) {
    const ids = await fetchAttractionIdsNear(supabase, center, radiusKm);
    attractionsInBbox = Math.max(attractionsInBbox, ids.length);
    if (ids.length === 0) continue;

    const rows = await fetchTagRows(supabase, query.activities, ids);
    tagRows = mergeTagRows(tagRows, rows);
    geoRadiusUsed = radiusKm;

    if (missingActivities(tagRows, query.activities).length === 0) {
      break;
    }
  }

  return { tagRows, geoRadiusUsed, attractionsInBbox };
}

async function supplementMissingActivities(
  query: ActivitySearchQuery & { near_lat: number; near_lon: number },
  missing: string[],
): Promise<{ osmFilled: boolean; googleFilled: boolean }> {
  const center = { lat: query.near_lat, lon: query.near_lon };
  const radiusKm = fillRadiusKm(query.near_radius_km ?? 120);
  let osmFilled = false;
  let googleFilled = false;

  if (missing.length === 0) return { osmFilled, googleFilled };

  try {
    await fillDestinationAttractionsFromOsm({
      lat: center.lat,
      lon: center.lon,
      radiusKm,
      activitySlugs: missing,
    });
    osmFilled = true;
  } catch {
    /* optional */
  }

  try {
    const result = await fillDestinationAttractionsFromGoogle({
      lat: center.lat,
      lon: center.lon,
      radiusKm,
      activitySlugs: query.activities,
      destinationLabel: query.destination_label,
      onlySlugs: missing,
    });
    if (result.persisted > 0) googleFilled = true;
  } catch {
    /* optional */
  }

  return { osmFilled, googleFilled };
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
  let googleFilled = false;

  if (hasNearPoint(effectiveQuery)) {
    await ensureDestinationActivities({
      lat: effectiveQuery.near_lat,
      lon: effectiveQuery.near_lon,
      radiusKm: effectiveQuery.near_radius_km ?? 120,
      destinationLabel: effectiveQuery.destination_label,
    }).catch(() => {});

    const fetched = await fetchTagRowsForRadii(supabase, effectiveQuery);
    tagRows = fetched.tagRows;
    geoRadiusUsed = fetched.geoRadiusUsed;
    attractionsInBbox = fetched.attractionsInBbox;

    let missing = missingActivities(tagRows, effectiveQuery.activities);
    if (missing.length > 0) {
      const supplemented = await supplementMissingActivities(
        effectiveQuery,
        missing,
      );
      osmFilled = supplemented.osmFilled;
      googleFilled = supplemented.googleFilled;

      const refetched = await fetchTagRowsForRadii(supabase, effectiveQuery);
      tagRows = refetched.tagRows;
      geoRadiusUsed = refetched.geoRadiusUsed ?? geoRadiusUsed;
      attractionsInBbox = Math.max(attractionsInBbox, refetched.attractionsInBbox);
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
        google_filled: googleFilled,
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
        google_filled: googleFilled,
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
      google_filled: googleFilled,
    },
  };
}
