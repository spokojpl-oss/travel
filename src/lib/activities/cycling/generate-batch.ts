import { generateCyclingRoute } from "@/lib/activities/cycling/ors-client";
import { lineStringWkt, pointWkt } from "@/lib/activities/cycling/geometry";
import type { ActivityType } from "@/types/activities";
import type { Json } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

export type BatchRouteSpec = {
  targetDistanceKm: number;
  activityType: ActivityType;
  loop?: boolean;
  seed?: number;
};

export const DEFAULT_BATCH_SPECS: BatchRouteSpec[] = [
  { targetDistanceKm: 35, activityType: "cycling_road", loop: true, seed: 11 },
  { targetDistanceKm: 55, activityType: "cycling_road", loop: true, seed: 22 },
  { targetDistanceKm: 75, activityType: "cycling_gravel", loop: true, seed: 33 },
  { targetDistanceKm: 45, activityType: "cycling_mtb", loop: true, seed: 44 },
];

export async function generateCyclingRouteBatch(input: {
  destinationId: string;
  startLat: number;
  startLng: number;
  specs?: BatchRouteSpec[];
}) {
  const specs = input.specs ?? DEFAULT_BATCH_SPECS;
  const supabase = createAdminClient();

  const results = await Promise.allSettled(
    specs.map((spec) =>
      generateCyclingRoute({
        startLat: input.startLat,
        startLng: input.startLng,
        targetDistanceKm: spec.targetDistanceKm,
        activityType: spec.activityType,
        loop: spec.loop ?? true,
      }),
    ),
  );

  const inserted: unknown[] = [];
  const errors: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    const spec = specs[i]!;
    if (result.status === "rejected") {
      errors.push(
        `${spec.targetDistanceKm} km: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
      );
      continue;
    }

    const route = result.value;
    const geometryWkt = lineStringWkt(route.geometryGeoJson.coordinates);
    if (!geometryWkt) {
      errors.push(`${spec.targetDistanceKm} km: invalid geometry`);
      continue;
    }

    const typeLabel =
      spec.activityType === "cycling_mtb"
        ? "MTB"
        : spec.activityType === "cycling_gravel"
          ? "Gravel"
          : "Szosa";

    const { data, error } = await supabase
      .from("activity_routes")
      .insert({
        destination_id: input.destinationId,
        category: "cycling",
        activity_type: spec.activityType,
        source: "ors_generated",
        name: `${typeLabel} ${Math.round(route.distance_m / 1000)} km`,
        distance_m: route.distance_m,
        elevation_gain_m: route.elevation_gain_m,
        elevation_loss_m: route.elevation_loss_m,
        surface_mix: route.surface_mix,
        is_loop: spec.loop ?? true,
        start_point: pointWkt(route.snappedLng, route.snappedLat),
        geometry: geometryWkt,
        elevation_profile: route.elevation_profile as unknown as Json,
      })
      .select()
      .single();

    if (error) {
      errors.push(`${spec.targetDistanceKm} km: ${error.message}`);
    } else if (data) {
      inserted.push(data);
    }
  }

  return {
    routes: inserted,
    generated: inserted.length,
    failed: errors.length,
    errors,
  };
}
