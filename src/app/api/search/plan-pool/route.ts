import { createClient } from "@/lib/supabase/server";
import { loadTouristRegionsCatalog } from "@/lib/destinations/tourist-regions-store";
import { enrichClusterWithSettlement } from "@/lib/search/settlement-resolver";
import { searchActivities } from "@/lib/search/activity-search";
import {
  buildRawPlanAttractionPool,
  tripDaysFromDates,
} from "@/lib/plan/build-plan-pool";
import { buildDiscoverPlaces } from "@/lib/plan/build-discover-places";
import { filterDiscoverForCyclingRest } from "@/lib/plan/cycling-plan";
import { injectCuratedPicksForRegions } from "@/lib/plan/curated-day-trips";
import { matchingRegionsForDestination } from "@/lib/plan/destination-story";
import {
  centroidOfTouristRegions,
  filterAttractionsToTouristRegions,
  reanchorClusterToTouristRegions,
} from "@/lib/plan/tourist-region-anchor";
import { resolvePlanSearchRadii } from "@/lib/plan/day-trip-radius";
import {
  defaultExplorationScope,
  explorationScopeFromString,
} from "@/lib/search/exploration-scope";
import { distanceKm } from "@/lib/search/geo-clustering";
import type { AttractionWithActivities, GeoCluster } from "@/types/domain";
import { z } from "zod";

const bodySchema = z.object({
  cluster: z.custom<GeoCluster>(),
  activities: z.array(z.string()).min(1),
  destination_label: z.string().optional(),
  tourist_region_id: z.string().nullable().optional(),
  tourist_region_ids: z.array(z.string()).optional(),
  exploration_scope: z.string().nullable().optional(),
  stay_radius_km: z.number().min(3).max(80).optional(),
  explore_radius_km: z.number().min(3).max(500).optional(),
  departure_date: z.string(),
  return_date: z.string().nullable().optional(),
  with_kids: z.boolean().optional(),
  locale: z.enum(["pl", "en"]).optional(),
  is_cycling: z.boolean().optional(),
  region_context: z
    .object({
      id: z.string().optional(),
      name_pl: z.string(),
      name_en: z.string(),
      overview_pl: z.string(),
      overview_en: z.string(),
      stay_hint_pl: z.string(),
      stay_hint_en: z.string(),
    })
    .nullable()
    .optional(),
});

function flattenSearchAttractions(
  clusters: GeoCluster[],
  center: { lat: number; lon: number },
  maxKm: number,
): AttractionWithActivities[] {
  const byId = new Map<string, AttractionWithActivities>();
  for (const cluster of clusters) {
    for (const a of cluster.attractions) {
      if (distanceKm(center, { lat: Number(a.lat), lon: Number(a.lon) }) > maxKm) {
        continue;
      }
      byId.set(a.id, a);
    }
  }
  return [...byId.values()];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const scope =
    explorationScopeFromString(parsed.data.exploration_scope) ??
    defaultExplorationScope();
  const tripDays = tripDaysFromDates(
    parsed.data.departure_date,
    parsed.data.return_date ?? parsed.data.departure_date,
  );
  const label = parsed.data.destination_label ?? "";

  const catalog = await loadTouristRegionsCatalog();
  const selectedRegions = matchingRegionsForDestination(
    catalog,
    label,
    parsed.data.tourist_region_id,
    parsed.data.tourist_region_ids,
  );
  const anchorPoint =
    centroidOfTouristRegions(selectedRegions) ??
    parsed.data.cluster.center;

  let enrichedCluster = await enrichClusterWithSettlement(
    parsed.data.cluster,
    label,
  );

  if (selectedRegions.length > 0) {
    enrichedCluster = reanchorClusterToTouristRegions(
      enrichedCluster,
      selectedRegions,
    );
    enrichedCluster = await enrichClusterWithSettlement(
      enrichedCluster,
      label,
    );
  }

  const radii = resolvePlanSearchRadii({
    scope,
    tripDays,
    stayRadiusKm: parsed.data.stay_radius_km,
    exploreRadiusKm: parsed.data.explore_radius_km,
  });

  const searchResult = await searchActivities({
    activities: parsed.data.activities,
    destination_label: label,
    near_lat: anchorPoint.lat,
    near_lon: anchorPoint.lon,
    stay_radius_km: radii.stay_radius_km,
    explore_radius_km: radii.explore_radius_km,
    max_radius_km: radii.stay_radius_km,
    near_radius_km: radii.explore_radius_km,
    match_mode: "any",
    min_per_activity: 1,
    exploration_scope: scope,
  });

  const expanded = flattenSearchAttractions(
    searchResult.clusters,
    anchorPoint,
    radii.explore_radius_km,
  );

  let attractionPool = buildRawPlanAttractionPool({
    clusterAttractions: enrichedCluster.attractions,
    expandedAttractions: expanded,
    destinationLabel: label,
    touristRegionId: parsed.data.tourist_region_id,
    touristRegionIds: parsed.data.tourist_region_ids,
    explorationScope: scope,
    tripDays,
    referencePoint: anchorPoint,
    locale: parsed.data.locale ?? "pl",
    catalog,
    preferredActivities: parsed.data.activities,
  });

  if (selectedRegions.length > 0) {
    attractionPool = injectCuratedPicksForRegions({
      catalog,
      regionIds: selectedRegions.map((r) => r.id),
      existingPool: attractionPool,
      locale: parsed.data.locale ?? "pl",
    });
    attractionPool = filterAttractionsToTouristRegions(
      attractionPool,
      selectedRegions,
      5,
    );
  } else {
    attractionPool = attractionPool.filter(
      (a) =>
        distanceKm(anchorPoint, {
          lat: Number(a.lat),
          lon: Number(a.lon),
        }) <= radii.explore_radius_km,
    );
  }

  const discover = buildDiscoverPlaces({
    pool: attractionPool,
    catalog,
    destinationLabel: label,
    touristRegionId: parsed.data.tourist_region_id,
    touristRegionIds: parsed.data.tourist_region_ids,
    regionContext: parsed.data.region_context ?? undefined,
    preferredActivities: parsed.data.activities,
    locale: parsed.data.locale ?? "pl",
    tripDays,
    explorationScope: scope,
    referencePoint: anchorPoint,
    withKids: parsed.data.with_kids,
    stayRadiusKm: radii.stay_radius_km,
    cyclingRestMode: parsed.data.is_cycling === true,
  });

  const discoverFiltered = parsed.data.is_cycling
    ? { ...discover, ...filterDiscoverForCyclingRest(discover, selectedRegions) }
    : discover;

  return Response.json({
    cluster: enrichedCluster,
    attractionPool,
    discover: discoverFiltered,
    tripDays,
    explorationScope: scope,
    exploreRadiusKm: radii.explore_radius_km,
    stayRadiusKm: radii.stay_radius_km,
  });
}
