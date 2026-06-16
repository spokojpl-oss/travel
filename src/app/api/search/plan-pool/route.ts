import { createClient } from "@/lib/supabase/server";
import { enrichClusterWithSettlement } from "@/lib/search/settlement-resolver";
import { searchActivities } from "@/lib/search/activity-search";
import {
  buildPlanAttractionPool,
  tripDaysFromDates,
} from "@/lib/plan/build-plan-pool";
import { computeLodgingBaseOptions } from "@/lib/plan/lodging-base-options";
import { dayTripRadiusKm, nearbyStayRadiusKm } from "@/lib/plan/day-trip-radius";
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

  const dayTripKm = dayTripRadiusKm(scope, tripDays);
  const nearbyKm = nearbyStayRadiusKm(scope);

  const searchResult = await searchActivities({
    activities: parsed.data.activities,
    destination_label: label,
    near_lat: enrichedCluster.center.lat,
    near_lon: enrichedCluster.center.lon,
    near_radius_km: dayTripKm,
    max_radius_km: nearbyKm,
    match_mode: "any",
    min_per_activity: 1,
    exploration_scope: scope,
  });

  const expanded = flattenSearchAttractions(
    searchResult.clusters,
    enrichedCluster.center,
    dayTripKm,
  );

  const baseOptions = computeLodgingBaseOptions(enrichedCluster.attractions, {
    withKids: parsed.data.with_kids,
    locale: parsed.data.locale,
    cluster: enrichedCluster,
  });

  const defaultBase =
    baseOptions.find((o) => o.choice === "quiet_area") ?? baseOptions[0];
  const basePoint = defaultBase
    ? { lat: defaultBase.lat, lon: defaultBase.lon }
    : enrichedCluster.center;

  const { pool, suggestedIds } = buildPlanAttractionPool({
    clusterAttractions: enrichedCluster.attractions,
    expandedAttractions: expanded,
    destinationLabel: label,
    touristRegionId: parsed.data.tourist_region_id,
    explorationScope: scope,
    tripDays,
    basePoint,
    locale: parsed.data.locale ?? "pl",
  });

  return Response.json({
    cluster: enrichedCluster,
    attractionPool: pool,
    suggestedAttractionIds: suggestedIds,
    lodgingBaseOptions: baseOptions,
    dayTripRadiusKm: dayTripKm,
  });
}
