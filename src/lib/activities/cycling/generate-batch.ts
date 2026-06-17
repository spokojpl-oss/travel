import { createAdminClient } from "@/lib/supabase/admin";
import { parseRouteStartPoint } from "@/lib/supabase/activity-routes";
import { distanceKm } from "@/lib/search/geo-clustering";
import { generateCyclingRoute } from "@/lib/activities/cycling/ors-client";
import { lineStringWkt, pointWkt } from "@/lib/activities/cycling/geometry";
import {
  BATCH_ROUTE_COUNT,
  INITIAL_DESTINATION_ROUTE_COUNT,
  type CyclingRouteRegionTarget,
} from "@/lib/activities/cycling/route-distribution";
import type { ActivityType } from "@/types/activities";
import type { Json } from "@/types/database";

export {
  BATCH_ROUTE_COUNT,
  INITIAL_DESTINATION_ROUTE_COUNT,
} from "@/lib/activities/cycling/route-distribution";

export const DEFAULT_REGION_RADIUS_KM = 30;
export const DEFAULT_DESTINATION_RADIUS_KM = 55;

const ROUTE_PRESET_TEMPLATES: Array<{
  targetDistanceKm: number;
  activityType: ActivityType;
}> = [
  { targetDistanceKm: 25, activityType: "cycling_road" },
  { targetDistanceKm: 32, activityType: "cycling_road" },
  { targetDistanceKm: 40, activityType: "cycling_road" },
  { targetDistanceKm: 48, activityType: "cycling_road" },
  { targetDistanceKm: 35, activityType: "cycling_gravel" },
  { targetDistanceKm: 42, activityType: "cycling_gravel" },
  { targetDistanceKm: 28, activityType: "cycling_mtb" },
  { targetDistanceKm: 38, activityType: "cycling_mtb" },
  { targetDistanceKm: 45, activityType: "cycling_ebike" },
  { targetDistanceKm: 55, activityType: "cycling_ebike" },
  { targetDistanceKm: 52, activityType: "cycling_touring" },
  { targetDistanceKm: 30, activityType: "cycling_road" },
  { targetDistanceKm: 58, activityType: "cycling_gravel" },
  { targetDistanceKm: 22, activityType: "cycling_mtb" },
  { targetDistanceKm: 65, activityType: "cycling_touring" },
];

export type RegionBatchResult = {
  label?: string;
  requested: number;
  created: number;
};

export function buildRoutePresets(
  count: number,
  startIndex = 0,
): Array<{ targetDistanceKm: number; activityType: ActivityType }> {
  return Array.from({ length: count }, (_, i) => {
    const template =
      ROUTE_PRESET_TEMPLATES[(startIndex + i) % ROUTE_PRESET_TEMPLATES.length]!;
    const cycle = Math.floor((startIndex + i) / ROUTE_PRESET_TEMPLATES.length);
    return {
      activityType: template.activityType,
      targetDistanceKm: template.targetDistanceKm + cycle * 4,
    };
  });
}

type RouteJob = {
  preset: { targetDistanceKm: number; activityType: ActivityType };
  centerLat: number;
  centerLng: number;
  maxRadiusKm: number;
  label?: string;
  globalIndex: number;
};

async function hasSimilarStoredRoute(
  supabase: ReturnType<typeof createAdminClient>,
  destinationId: string,
  activityType: ActivityType,
  distanceM: number,
  startLat: number,
  startLng: number,
): Promise<boolean> {
  const { data } = await supabase
    .from("activity_routes")
    .select("id, distance_m, start_point")
    .eq("destination_id", destinationId)
    .eq("activity_type", activityType)
    .gte("distance_m", Math.round(distanceM * 0.92))
    .lte("distance_m", Math.round(distanceM * 1.08))
    .limit(30);

  if (!data?.length) return false;

  for (const row of data) {
    const start = parseRouteStartPoint(row.start_point);
    if (!start) continue;
    if (
      distanceKm(
        { lat: startLat, lon: startLng },
        { lat: start.lat, lon: start.lng },
      ) < 1.5
    ) {
      return true;
    }
  }
  return false;
}

const MAX_ROUTE_ATTEMPTS = 8;

async function tryCreateRouteJob(
  supabase: ReturnType<typeof createAdminClient>,
  destinationId: string,
  job: RouteJob,
  presetStartIndex: number,
): Promise<{ ok: true; id: string } | { ok: false }> {
  for (let attempt = 0; attempt < MAX_ROUTE_ATTEMPTS; attempt++) {
    try {
      const seed =
        presetStartIndex + job.globalIndex * 17 + attempt * 31 + 1;
      const route = await generateCyclingRoute({
        startLat: job.centerLat,
        startLng: job.centerLng,
        targetDistanceKm: job.preset.targetDistanceKm,
        activityType: job.preset.activityType,
        loop: true,
        maxRadiusKm: job.maxRadiusKm,
        seed,
      });

      const geometryWkt = lineStringWkt(route.geometryGeoJson.coordinates);
      if (!geometryWkt) continue;

      const duplicate = await hasSimilarStoredRoute(
        supabase,
        destinationId,
        job.preset.activityType,
        route.distance_m,
        route.snappedLat,
        route.snappedLng,
      );
      if (duplicate) continue;

      const typeLabel = job.preset.activityType.replace("cycling_", "");
      const regionSuffix = job.label ? ` · ${job.label}` : "";

      const { data, error } = await supabase
        .from("activity_routes")
        .insert({
          destination_id: destinationId,
          category: "cycling",
          activity_type: job.preset.activityType,
          source: "ors_generated",
          name: `Trasa ${Math.round(route.distance_m / 1000)} km · ${typeLabel}${regionSuffix}`,
          distance_m: route.distance_m,
          elevation_gain_m: route.elevation_gain_m,
          elevation_loss_m: route.elevation_loss_m,
          surface_mix: route.surface_mix,
          is_loop: true,
          start_point: pointWkt(route.snappedLng, route.snappedLat),
          geometry: geometryWkt,
          elevation_profile: route.elevation_profile as unknown as Json,
          popularity_score: 50 - job.globalIndex,
        })
        .select("id")
        .single();

      if (error || !data?.id) continue;
      return { ok: true, id: data.id };
    } catch {
      /* spróbuj inny seed / profil ORS */
    }
  }

  return { ok: false };
}

export async function generateCyclingRoutesBatch({
  destinationId,
  regions,
  presetStartIndex = 0,
}: {
  destinationId: string;
  regions: CyclingRouteRegionTarget[];
  concurrency?: number;
  presetStartIndex?: number;
}): Promise<{
  created: number;
  failed: number;
  routeIds: string[];
  regions: RegionBatchResult[];
}> {
  const supabase = createAdminClient();
  const routeIds: string[] = [];
  const regionResults: RegionBatchResult[] = [];
  let globalIndex = 0;
  let presetCursor = presetStartIndex;

  for (const region of regions) {
    const presets = buildRoutePresets(region.count, presetCursor);
    presetCursor += region.count;
    const maxRadiusKm = region.maxRadiusKm ?? DEFAULT_REGION_RADIUS_KM;
    let regionCreated = 0;

    for (const preset of presets) {
      const job: RouteJob = {
        preset,
        centerLat: region.centerLat,
        centerLng: region.centerLng,
        maxRadiusKm,
        label: region.label,
        globalIndex,
      };
      globalIndex += 1;

      const outcome = await tryCreateRouteJob(
        supabase,
        destinationId,
        job,
        presetStartIndex,
      );
      if (outcome.ok) {
        routeIds.push(outcome.id);
        regionCreated += 1;
      }
    }

    regionResults.push({
      label: region.label,
      requested: presets.length,
      created: regionCreated,
    });
  }

  const requestedTotal = regionResults.reduce((sum, r) => sum + r.requested, 0);

  return {
    created: routeIds.length,
    failed: requestedTotal - routeIds.length,
    routeIds,
    regions: regionResults,
  };
}

/** Kompatybilność wsteczna — jeden rejon. */
export async function generateCyclingRoutesAtCenter({
  destinationId,
  centerLat,
  centerLng,
  count = BATCH_ROUTE_COUNT,
  maxRadiusKm = DEFAULT_REGION_RADIUS_KM,
  presetStartIndex = 0,
}: {
  destinationId: string;
  centerLat: number;
  centerLng: number;
  count?: number;
  maxRadiusKm?: number;
  presetStartIndex?: number;
  concurrency?: number;
}): Promise<{
  created: number;
  failed: number;
  routeIds: string[];
  regions: RegionBatchResult[];
}> {
  return generateCyclingRoutesBatch({
    destinationId,
    regions: [{ centerLat, centerLng, count, maxRadiusKm }],
    presetStartIndex,
  });
}
