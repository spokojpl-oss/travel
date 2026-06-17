import { createAdminClient } from "@/lib/supabase/admin";
import { generateCyclingRoute } from "@/lib/activities/cycling/ors-client";
import { lineStringWkt, pointWkt } from "@/lib/activities/cycling/geometry";
import type { ActivityType } from "@/types/activities";
import type { Json } from "@/types/database";

export const BATCH_ROUTE_COUNT = 10;
export const DEFAULT_REGION_RADIUS_KM = 30;

export const BATCH_ROUTE_PRESETS: Array<{
  targetDistanceKm: number;
  activityType: ActivityType;
}> = [
  { targetDistanceKm: 25, activityType: "cycling_road" },
  { targetDistanceKm: 32, activityType: "cycling_road" },
  { targetDistanceKm: 40, activityType: "cycling_road" },
  { targetDistanceKm: 48, activityType: "cycling_gravel" },
  { targetDistanceKm: 35, activityType: "cycling_gravel" },
  { targetDistanceKm: 28, activityType: "cycling_mtb" },
  { targetDistanceKm: 38, activityType: "cycling_mtb" },
  { targetDistanceKm: 45, activityType: "cycling_ebike" },
  { targetDistanceKm: 55, activityType: "cycling_ebike" },
  { targetDistanceKm: 52, activityType: "cycling_touring" },
];

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

export async function generateCyclingRoutesBatch({
  destinationId,
  centerLat,
  centerLng,
  count = BATCH_ROUTE_COUNT,
  maxRadiusKm = DEFAULT_REGION_RADIUS_KM,
  concurrency = 5,
}: {
  destinationId: string;
  centerLat: number;
  centerLng: number;
  count?: number;
  maxRadiusKm?: number;
  concurrency?: number;
}): Promise<{ created: number; failed: number; routeIds: string[] }> {
  const supabase = createAdminClient();
  const presets = BATCH_ROUTE_PRESETS.slice(0, count);

  const outcomes = await runPool(presets, concurrency, async (preset, index) => {
    try {
      const route = await generateCyclingRoute({
        startLat: centerLat,
        startLng: centerLng,
        targetDistanceKm: preset.targetDistanceKm,
        activityType: preset.activityType,
        loop: true,
        maxRadiusKm,
      });

      const geometryWkt = lineStringWkt(route.geometryGeoJson.coordinates);
      if (!geometryWkt) return { ok: false as const };

      const { data, error } = await supabase
        .from("activity_routes")
        .insert({
          destination_id: destinationId,
          category: "cycling",
          activity_type: preset.activityType,
          source: "ors_generated",
          name: `Trasa ${Math.round(route.distance_m / 1000)} km · ${preset.activityType.replace("cycling_", "")}`,
          distance_m: route.distance_m,
          elevation_gain_m: route.elevation_gain_m,
          elevation_loss_m: route.elevation_loss_m,
          surface_mix: route.surface_mix,
          is_loop: true,
          start_point: pointWkt(route.snappedLng, route.snappedLat),
          geometry: geometryWkt,
          elevation_profile: route.elevation_profile as unknown as Json,
          popularity_score: 40 - index,
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
