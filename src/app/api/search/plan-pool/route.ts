import { createClient } from "@/lib/supabase/server";
import { loadTouristRegionsCatalog } from "@/lib/destinations/tourist-regions-store";
import { enrichClusterWithSettlement } from "@/lib/search/settlement-resolver";
import { searchActivities } from "@/lib/search/activity-search";
import {
  buildRawPlanAttractionPool,
  tripDaysFromDates,
} from "@/lib/plan/build-plan-pool";
import { buildDiscoverPlaces } from "@/lib/plan/build-discover-places";
import { exploreRadiusKm, stayRadiusKm } from "@/lib/plan/day-trip-radius";
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
  exploration_scope: z.string().nullable().optional(),
  departure_date: z.string(),
  return_date: z.string().nullable().optional(),
  with_kids: z.boolean().optional(),
  locale: z.enum(["pl", "en"]).optional(),
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

  const enrichedCluster = await enrichClusterWithSettlement(
    parsed.data.cluster,
    label,
  );

  const exploreKm = exploreRadiusKm(scope, tripDays);
  const stayKm = stayRadiusKm(scope);

  const searchResult = await searchActivities({
    activities: parsed.data.activities,
    destination_label: label,
    near_lat: enrichedCluster.center.lat,
    near_lon: enrichedCluster.center.lon,
    stay_radius_km: stayKm,
    explore_radius_km: exploreKm,
    max_radius_km: stayKm,
    near_radius_km: exploreKm,
    match_mode: "any",
    min_per_activity: 1,
    exploration_scope: scope,
  });

  const expanded = flattenSearchAttractions(
    searchResult.clusters,
    enrichedCluster.center,
    exploreKm,
  );

  const catalog = await loadTouristRegionsCatalog();

  const attractionPool = buildRawPlanAttractionPool({
    clusterAttractions: enrichedCluster.attractions,
    expandedAttractions: expanded,
    destinationLabel: label,
    touristRegionId: parsed.data.tourist_region_id,
    explorationScope: scope,
    tripDays,
    referencePoint: enrichedCluster.center,
    locale: parsed.data.locale ?? "pl",
    catalog,
    preferredActivities: parsed.data.activities,
  });

  const discover = buildDiscoverPlaces({
    pool: attractionPool,
    catalog,
    destinationLabel: label,
    touristRegionId: parsed.data.tourist_region_id,
    regionContext: parsed.data.region_context ?? undefined,
    preferredActivities: parsed.data.activities,
    locale: parsed.data.locale ?? "pl",
    tripDays,
    explorationScope: scope,
    referencePoint: enrichedCluster.center,
    withKids: parsed.data.with_kids,
  });

  return Response.json({
    cluster: enrichedCluster,
    attractionPool,
    discover,
    tripDays,
    explorationScope: scope,
    exploreRadiusKm: exploreKm,
    stayRadiusKm: stayKm,
  });
}
