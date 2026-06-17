/** Startowy pakiet tras dla całej destynacji (przed zawężeniem do rejonów). */
export const INITIAL_DESTINATION_ROUTE_COUNT = 20;

/** Każde ręczne / automatyczne uzupełnienie w wybranych rejonach. */
export const BATCH_ROUTE_COUNT = 10;

export type CyclingRouteRegionTarget = {
  centerLat: number;
  centerLng: number;
  count: number;
  maxRadiusKm?: number;
  label?: string;
  /** coastal = nad morzem (domyślnie), inland = w głąb lądu */
  terrain?: "coastal" | "inland";
};

/** Dzieli `total` tras między `regionCount` rejonów (np. 10 ÷ 3 → 4, 3, 3). */
export function distributeRouteCounts(
  total: number,
  regionCount: number,
): number[] {
  if (regionCount <= 0) return [total];
  const base = Math.floor(total / regionCount);
  const remainder = total % regionCount;
  return Array.from({ length: regionCount }, (_, i) =>
    base + (i < remainder ? 1 : 0),
  ).filter((n) => n > 0);
}

export function buildRegionBatchTargets(
  regions: Array<{
    centerLat: number;
    centerLng: number;
    maxRadiusKm?: number;
    label?: string;
  }>,
  totalCount: number,
): CyclingRouteRegionTarget[] {
  const counts = distributeRouteCounts(totalCount, regions.length);
  return regions
    .map((region, index) => ({
      centerLat: region.centerLat,
      centerLng: region.centerLng,
      count: counts[index] ?? 0,
      maxRadiusKm: region.maxRadiusKm,
      label: region.label,
    }))
    .filter((r) => r.count > 0);
}
