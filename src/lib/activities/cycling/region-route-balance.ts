import { distanceKm } from "@/lib/search/geo-clustering";
import { parseRouteGeometry } from "@/lib/supabase/activity-routes";
import type { ActivityRoute } from "@/types/activities";
import {
  distributeRouteCounts,
  type CyclingRouteRegionTarget,
} from "@/lib/activities/cycling/route-distribution";
import { storedRouteMatchesRegionCenter } from "@/lib/activities/cycling/route-validation";
import { DEFAULT_REGION_RADIUS_KM } from "@/lib/activities/cycling/generate-batch";
import type { CyclingRegionCenter } from "@/lib/activities/cycling/types";

type RegionPoint = {
  lat: number;
  lng: number;
  radiusKm: number;
  label?: string;
};

/** Przypisuje trasę do najbliższego rejonu, w którego promieniu leży start. */
export function assignRouteToRegionIndex(
  route: ActivityRoute,
  regions: RegionPoint[],
): number {
  const path = parseRouteGeometry(route.geometry);
  if (path.length === 0) return -1;

  const start = path[0]!;
  let bestIdx = -1;
  let bestDist = Infinity;

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i]!;
    if (
      !storedRouteMatchesRegionCenter(
        route.distance_m,
        path,
        region.lat,
        region.lng,
        region.radiusKm,
      )
    ) {
      continue;
    }

    const dist = distanceKm(
      { lat: start.lat, lon: start.lng },
      { lat: region.lat, lon: region.lng },
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
}

export function countRoutesPerRegion(
  routes: ActivityRoute[],
  regions: RegionPoint[],
): number[] {
  const counts = Array.from({ length: regions.length }, () => 0);
  for (const route of routes) {
    const idx = assignRouteToRegionIndex(route, regions);
    if (idx >= 0) counts[idx]! += 1;
  }
  return counts;
}

/** Ile tras brakuje w każdym rejonie względem docelowego podziału. */
export function buildRegionTopUpTargets(
  routes: ActivityRoute[],
  regionCenters: CyclingRegionCenter[],
  targetTotal: number,
): CyclingRouteRegionTarget[] {
  if (regionCenters.length === 0) return [];

  const regions: RegionPoint[] = regionCenters.map((region) => ({
    lat: region.lat,
    lng: region.lng,
    radiusKm: region.radiusKm ?? DEFAULT_REGION_RADIUS_KM,
    label: region.label,
  }));

  const desired = distributeRouteCounts(targetTotal, regions.length);
  const existing = countRoutesPerRegion(routes, regions);

  return regions
    .map((region, index) => ({
      centerLat: region.lat,
      centerLng: region.lng,
      count: Math.max(0, (desired[index] ?? 0) - (existing[index] ?? 0)),
      maxRadiusKm: region.radiusKm,
      label: region.label,
    }))
    .filter((target) => target.count > 0);
}

export function formatRegionBatchSummary(
  regions: Array<{ label?: string; requested: number; created: number }>,
): string | null {
  const parts = regions
    .map((region) =>
      region.label
        ? `${region.label}: ${region.created}/${region.requested}`
        : `${region.created}/${region.requested}`,
    )
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
