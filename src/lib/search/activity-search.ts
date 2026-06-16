import { createAdminClient } from "@/lib/supabase/admin";
import { fillDestinationAttractionsFromOsm } from "@/lib/api/destination-osm-fill";
import { fillDestinationAttractionsFromGoogle } from "@/lib/api/destination-google-fill";
import {
  ensureDestinationActivities,
  fillRadiusKm,
} from "@/lib/api/destination-activity-prefill";
import { findAirportsForDestination } from "@/lib/flights/airport-finder";
import {
  pointInIslandBbox,
  resolveIslandBoundaryForSearch,
  settlementConflictsWithIsland,
  type IslandBoundary,
} from "@/lib/destinations/island-boundary";
import { clusterAttractions, distanceKm } from "./geo-clustering";
import {
  applyExplorationScopeToQuery,
  explorationScopeFromString,
} from "./exploration-scope";
import { enrichClustersWithSettlements } from "./settlement-resolver";
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
const ID_CHUNK_PARALLEL = 8;
/** Budżet czasu na uzupełnianie OSM/Google w trakcie wyszukiwania (ms). */
const SUPPLEMENT_BUDGET_MS = 12_000;
/** Gdy baza pusta — pełniejsze uzupełnienie z OSM (cała wyspa / region). */
const EMPTY_DB_FILL_BUDGET_MS = 38_000;
const SEARCH_TIME_BUDGET_MS = 48_000;

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

async function fetchAttractionIdsInBbox(
  supabase: ReturnType<typeof createAdminClient>,
  bbox: { south: number; north: number; west: number; east: number },
  center?: { lat: number; lon: number },
  maxIds = 2500,
): Promise<string[]> {
  const { data } = await supabase
    .from("attractions")
    .select("id, lat, lon")
    .gte("lat", bbox.south)
    .lte("lat", bbox.north)
    .gte("lon", bbox.west)
    .lte("lon", bbox.east)
    .limit(8000);

  if (!data?.length) return [];

  const rows = data.map((a) => ({
    id: a.id,
    lat: Number(a.lat),
    lon: Number(a.lon),
  }));

  if (!center || rows.length <= maxIds) {
    return rows.map((a) => a.id);
  }

  return rows
    .sort(
      (a, b) =>
        distanceKm(center, a) - distanceKm(center, b),
    )
    .slice(0, maxIds)
    .map((a) => a.id);
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

  const chunks: string[][] = [];
  for (let i = 0; i < attractionIds.length; i += ID_CHUNK_SIZE) {
    chunks.push(attractionIds.slice(i, i + ID_CHUNK_SIZE));
  }

  for (let i = 0; i < chunks.length; i += ID_CHUNK_PARALLEL) {
    const batch = chunks.slice(i, i + ID_CHUNK_PARALLEL);
    const batchRows = await Promise.all(
      batch.map(async (chunk) => {
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
        return (data as TagRow[]) ?? [];
      }),
    );
    for (const part of batchRows) {
      if (part.length) rows.push(...part);
    }
  }

  return rows;
}

function remainingMs(startTime: number, budgetMs: number): number {
  return budgetMs - (Date.now() - startTime);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  if (timeoutMs <= 0) return fallback;
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
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

function searchRadiiForQuery(
  query: ActivitySearchQuery,
  island: IslandBoundary | null,
): number[] {
  const base = query.near_radius_km ?? 150;

  if (island) {
    if (query.exploration_scope === "island") {
      return [island.maxRadiusKm];
    }
    if (query.exploration_scope === "roadtrip") {
      return [Math.max(base, island.maxRadiusKm), base * 1.5];
    }
    return [base, base * 1.25];
  }

  if (query.destination_label && query.exploration_scope !== "roadtrip") {
    return [base, base * 1.5];
  }

  return [base, 250, 400];
}

function scopeUsesWholeIsland(
  query: ActivitySearchQuery,
  island: IslandBoundary | null,
): boolean {
  return (
    island != null &&
    (query.exploration_scope === "island" ||
      query.exploration_scope === "roadtrip")
  );
}

function filterAttractionsToIsland<T extends { lat: number; lon: number }>(
  attractions: T[],
  island: IslandBoundary | null,
): T[] {
  if (!island) return attractions;
  return attractions.filter((a) =>
    pointInIslandBbox({ lat: a.lat, lon: a.lon }, island.bbox),
  );
}

async function fetchTagRowsForRadii(
  supabase: ReturnType<typeof createAdminClient>,
  query: ActivitySearchQuery & { near_lat: number; near_lon: number },
  island: IslandBoundary | null,
): Promise<{
  tagRows: TagRow[];
  geoRadiusUsed: number | null;
  attractionsInBbox: number;
}> {
  const center = { lat: query.near_lat, lon: query.near_lon };
  const radii = searchRadiiForQuery(query, island);
  const wholeIsland = scopeUsesWholeIsland(query, island);

  let tagRows: TagRow[] = [];
  let geoRadiusUsed: number | null = null;
  let attractionsInBbox = 0;

  async function fetchByIslandBbox() {
    if (!island) return;
    const ids = await fetchAttractionIdsInBbox(
      supabase,
      island.bbox,
      center,
    );
    attractionsInBbox = Math.max(attractionsInBbox, ids.length);
    if (ids.length === 0) return;

    const rows = await fetchTagRows(supabase, query.activities, ids);
    tagRows = rows.filter(
      (row) =>
        row.attraction &&
        pointInIslandBbox(
          {
            lat: Number(row.attraction.lat),
            lon: Number(row.attraction.lon),
          },
          island.bbox,
        ),
    );
    geoRadiusUsed = island.maxRadiusKm;
  }

  async function fetchByRadius() {
    for (const radiusKm of radii) {
      const ids = await fetchAttractionIdsNear(supabase, center, radiusKm);
      attractionsInBbox = Math.max(attractionsInBbox, ids.length);
      if (ids.length === 0) continue;

      const rows = await fetchTagRows(supabase, query.activities, ids);
      const filteredRows = island
        ? rows.filter(
            (row) =>
              row.attraction &&
              pointInIslandBbox(
                {
                  lat: Number(row.attraction.lat),
                  lon: Number(row.attraction.lon),
                },
                island.bbox,
              ),
          )
        : rows;
      tagRows = mergeTagRows(tagRows, filteredRows);
      geoRadiusUsed = radiusKm;

      if (missingActivities(tagRows, query.activities).length === 0) {
        break;
      }
    }
  }

  if (wholeIsland) {
    await fetchByIslandBbox();
    if (tagRows.length === 0) await fetchByRadius();
  } else {
    await fetchByRadius();
    if (tagRows.length === 0 && island) await fetchByIslandBbox();
  }

  return { tagRows, geoRadiusUsed, attractionsInBbox };
}

async function supplementMissingActivities(
  query: ActivitySearchQuery & { near_lat: number; near_lon: number },
  missing: string[],
  timeoutMs: number,
): Promise<{ osmFilled: boolean; googleFilled: boolean }> {
  const center = { lat: query.near_lat, lon: query.near_lon };
  const island = resolveIslandBoundaryForSearch(
    query.destination_label,
    center,
  );
  const radiusKm = fillRadiusKm(query.near_radius_km ?? 120);
  const fillRadius = island
    ? Math.min(radiusKm, island.maxRadiusKm)
    : radiusKm;
  const searchBbox = island?.bbox;

  if (missing.length === 0 || timeoutMs <= 0) {
    return { osmFilled: false, googleFilled: false };
  }

  return withTimeout(
    (async () => {
      let osmFilled = false;
      let googleFilled = false;

      try {
        const osm = await fillDestinationAttractionsFromOsm({
          lat: center.lat,
          lon: center.lon,
          radiusKm: fillRadius,
          activitySlugs: missing,
          searchBbox,
        });
        osmFilled = osm.persisted > 0;
      } catch {
        /* optional */
      }

      try {
        const result = await fillDestinationAttractionsFromGoogle({
          lat: center.lat,
          lon: center.lon,
          radiusKm: fillRadius,
          activitySlugs: query.activities,
          destinationLabel: query.destination_label,
          onlySlugs: missing,
          islandBbox: island?.bbox,
          searchBbox,
        });
        if (result.persisted > 0) googleFilled = true;
      } catch {
        /* optional */
      }

      return { osmFilled, googleFilled };
    })(),
    timeoutMs,
    { osmFilled: false, googleFilled: false },
  );
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
  const island = resolveIslandBoundaryForSearch(
    effectiveQuery.destination_label,
    hasNearPoint(effectiveQuery)
      ? { lat: effectiveQuery.near_lat, lon: effectiveQuery.near_lon }
      : null,
  );

  let tagRows: TagRow[] = [];
  let geoRadiusUsed: number | null = null;
  let attractionsInBbox = 0;
  let osmFilled = false;
  let googleFilled = false;

  if (hasNearPoint(effectiveQuery)) {
    let fetched = await fetchTagRowsForRadii(supabase, effectiveQuery, island);
    tagRows = fetched.tagRows;
    geoRadiusUsed = fetched.geoRadiusUsed;
    attractionsInBbox = fetched.attractionsInBbox;

    if (tagRows.length === 0 || attractionsInBbox === 0) {
      const emptyFillBudget = Math.min(
        EMPTY_DB_FILL_BUDGET_MS,
        remainingMs(startTime, SEARCH_TIME_BUDGET_MS) - 8_000,
      );
      if (emptyFillBudget > 4_000) {
        const filled = await withTimeout(
          ensureDestinationActivities({
            lat: effectiveQuery.near_lat,
            lon: effectiveQuery.near_lon,
            radiusKm:
              effectiveQuery.near_radius_km ??
              island?.maxRadiusKm ??
              120,
            destinationLabel: effectiveQuery.destination_label,
          }),
          emptyFillBudget,
          { osmPersisted: 0, googlePersisted: 0 },
        );
        osmFilled = osmFilled || filled.osmPersisted > 0;
        googleFilled = googleFilled || filled.googlePersisted > 0;

        fetched = await fetchTagRowsForRadii(
          supabase,
          effectiveQuery,
          island,
        );
        tagRows = fetched.tagRows;
        geoRadiusUsed = fetched.geoRadiusUsed ?? geoRadiusUsed;
        attractionsInBbox = Math.max(
          attractionsInBbox,
          fetched.attractionsInBbox,
        );
      }
    }

    const missing = missingActivities(tagRows, effectiveQuery.activities);
    const supplementBudget = Math.min(
      SUPPLEMENT_BUDGET_MS,
      remainingMs(startTime, SEARCH_TIME_BUDGET_MS) - 8_000,
    );
    if (
      missing.length > 0 &&
      supplementBudget > 2_000 &&
      (tagRows.length === 0 || missing.length === effectiveQuery.activities.length)
    ) {
      const supplemented = await supplementMissingActivities(
        effectiveQuery,
        missing,
        supplementBudget,
      );
      osmFilled = supplemented.osmFilled;
      googleFilled = supplemented.googleFilled;

      const refetched = await fetchTagRowsForRadii(
        supabase,
        effectiveQuery,
        island,
      );
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
      view_mode: "regions",
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
  attractions = filterAttractionsToIsland(attractions, island);

  const isIslandView =
    effectiveQuery.exploration_scope === "island" && island != null;

  if (attractions.length > MAX_ATTRACTIONS_TO_CLUSTER) {
    if (isIslandView) {
      attractions = attractions.slice(0, MAX_ATTRACTIONS_TO_CLUSTER);
    } else if (hasNearPoint(effectiveQuery)) {
      const center = {
        lat: effectiveQuery.near_lat,
        lon: effectiveQuery.near_lon,
      };
      attractions = [...attractions]
        .sort(
          (a, b) =>
            distanceKm(center, { lat: a.lat, lon: a.lon }) -
            distanceKm(center, { lat: b.lat, lon: b.lon }),
        )
        .slice(0, MAX_ATTRACTIONS_TO_CLUSTER);
    } else {
      attractions = attractions.slice(0, MAX_ATTRACTIONS_TO_CLUSTER);
    }
  }

  if (attractions.length === 0) {
    return {
      query: effectiveQuery,
      clusters: [],
      view_mode: "regions",
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

  let searchAirports: Array<{
    iata_code: string;
    name: string;
    lat: number;
    lon: number;
  }> = [];

  if (island && hasNearPoint(effectiveQuery)) {
    try {
      const found = await findAirportsForDestination({
        center: { lat: effectiveQuery.near_lat, lon: effectiveQuery.near_lon },
        bbox: island.bbox,
        destinationLabel: effectiveQuery.destination_label,
        maxDistanceKm: island.maxRadiusKm,
        maxResults: Math.max(3, island.primaryAirports.length),
      });
      searchAirports = found.map((a) => ({
        iata_code: a.iata_code,
        name: a.name,
        lat: a.lat,
        lon: a.lon,
      }));
    } catch {
      /* lotniska opcjonalne */
    }
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

  const enrichBudget = remainingMs(startTime, SEARCH_TIME_BUDGET_MS);
  const enrichedClusters = await withTimeout(
    enrichClustersWithSettlements(topClusters),
    Math.max(enrichBudget, 8_000),
    topClusters,
  );

  let filtered = enrichedClusters;
  if (hasNearPoint(effectiveQuery)) {
    const center = { lat: effectiveQuery.near_lat, lon: effectiveQuery.near_lon };
    const radius = isIslandView
      ? island!.maxRadiusKm
      : island
        ? island.maxRadiusKm
        : (effectiveQuery.near_radius_km ?? geoRadiusUsed ?? 90);
    filtered = enrichedClusters
      .map((cluster) => ({
        cluster,
        dist: distanceKm(cluster.center, center),
      }))
      .filter((x) => {
        if (!isIslandView && x.dist > radius) return false;
        if (island && !pointInIslandBbox(x.cluster.center, island.bbox)) {
          return false;
        }
        if (
          island &&
          settlementConflictsWithIsland(x.cluster.settlement?.name, island)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) =>
        isIslandView ? b.cluster.score - a.cluster.score : a.dist - b.dist,
      )
      .map((x) => x.cluster);
  }

  const islandActivityCounts: Record<string, number> = {};
  if (isIslandView) {
    for (const a of attractions) {
      for (const tag of a.activity_tags) {
        if (effectiveQuery.activities.includes(tag.activity_slug)) {
          islandActivityCounts[tag.activity_slug] =
            (islandActivityCounts[tag.activity_slug] ?? 0) + 1;
        }
      }
    }
  }

  return {
    query: effectiveQuery,
    clusters: filtered,
    view_mode: isIslandView ? "island" : "regions",
    island_overview: isIslandView
      ? {
          island_name: island!.name,
          attractions,
          activity_counts: islandActivityCounts,
          airports: searchAirports,
          bbox: island!.bbox,
        }
      : undefined,
    airports: searchAirports.length > 0 ? searchAirports : undefined,
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
