import { createAdminClient } from "@/lib/supabase/admin";
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

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await worker(items[i]!, i);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );
  return results;
}

type RouteJob = {
  preset: { targetDistanceKm: number; activityType: ActivityType };
  centerLat: number;
  centerLng: number;
  maxRadiusKm: number;
  label?: string;
  globalIndex: number;
};

export async function generateCyclingRoutesBatch({
  destinationId,
  regions,
  concurrency = 5,
  presetStartIndex = 0,
}: {
  destinationId: string;
  regions: CyclingRouteRegionTarget[];
  concurrency?: number;
  presetStartIndex?: number;
}): Promise<{ created: number; failed: number; routeIds: string[] }> {
  const supabase = createAdminClient();

  const jobs: RouteJob[] = [];
  let presetCursor = presetStartIndex;

  for (const region of regions) {
    const presets = buildRoutePresets(region.count, presetCursor);
    presetCursor += region.count;
    const maxRadiusKm = region.maxRadiusKm ?? DEFAULT_REGION_RADIUS_KM;

    for (let i = 0; i < presets.length; i++) {
      jobs.push({
        preset: presets[i]!,
        centerLat: region.centerLat,
        centerLng: region.centerLng,
        maxRadiusKm,
        label: region.label,
        globalIndex: jobs.length,
      });
    }
  }

  const outcomes = await runPool(jobs, concurrency, async (job) => {
    try {
      const route = await generateCyclingRoute({
        startLat: job.centerLat,
        startLng: job.centerLng,
        targetDistanceKm: job.preset.targetDistanceKm,
        activityType: job.preset.activityType,
        loop: true,
        maxRadiusKm: job.maxRadiusKm,
        seed: presetStartIndex + job.globalIndex + 1,
      });

      const geometryWkt = lineStringWkt(route.geometryGeoJson.coordinates);
      if (!geometryWkt) return { ok: false as const };

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

      if (error || !data?.id) return { ok: false as const };
      return { ok: true as const, id: data.id };
    } catch {
      return { ok: false as const };
    }
  });

  const routeIds = outcomes
    .filter((o): o is { ok: true; id: string } => o.ok)
    .map((o) => o.id);

  return {
    created: routeIds.length,
    failed: outcomes.length - routeIds.length,
    routeIds,
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
  concurrency = 5,
}: {
  destinationId: string;
  centerLat: number;
  centerLng: number;
  count?: number;
  maxRadiusKm?: number;
  presetStartIndex?: number;
  concurrency?: number;
}): Promise<{ created: number; failed: number; routeIds: string[] }> {
  return generateCyclingRoutesBatch({
    destinationId,
    regions: [{ centerLat, centerLng, count, maxRadiusKm }],
    concurrency,
    presetStartIndex,
  });
}
