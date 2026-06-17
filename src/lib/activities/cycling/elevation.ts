import type { ActivityRoute, ElevationPoint } from "@/types/activities";

/** Maks. przewyższenie na jedną trasę (np. Teide ~2300 m, Alpy ~4500 m). */
export const MAX_ROUTE_ELEVATION_GAIN_M = 5500;

/** Maks. średnie nachylenie na całej trasie (~18%). */
const MAX_AVERAGE_GRADE = 0.18;

/** Pojedynczy skok profilu > 80 m traktujemy jako szum / błąd danych. */
const MAX_STEP_GAIN_M = 80;

export function isPlausibleElevationGainM(
  gainM: number,
  distanceM: number,
): boolean {
  if (!Number.isFinite(gainM) || gainM <= 0) return false;
  if (gainM > MAX_ROUTE_ELEVATION_GAIN_M) return false;
  if (distanceM > 0 && gainM / distanceM > MAX_AVERAGE_GRADE) return false;
  return true;
}

export function computeElevationGainFromProfile(
  profile: ElevationPoint[],
): number {
  if (profile.length < 2) return 0;
  let gain = 0;
  for (let i = 1; i < profile.length; i++) {
    const delta = profile[i]!.elev_m - profile[i - 1]!.elev_m;
    if (delta > 0 && delta <= MAX_STEP_GAIN_M) {
      gain += delta;
    }
  }
  return Math.round(gain);
}

export function resolveRouteElevationGainM(
  route: Pick<
    ActivityRoute,
    "elevation_gain_m" | "elevation_profile" | "distance_m"
  >,
): number | null {
  const stored = route.elevation_gain_m;
  if (
    stored != null &&
    isPlausibleElevationGainM(stored, route.distance_m)
  ) {
    return Math.round(stored);
  }

  const profile = route.elevation_profile;
  if (profile?.length) {
    const computed = computeElevationGainFromProfile(profile);
    if (isPlausibleElevationGainM(computed, route.distance_m)) {
      return computed;
    }
  }

  return null;
}

export function sumRouteElevationGainM(
  routes: Array<
    Pick<ActivityRoute, "elevation_gain_m" | "elevation_profile" | "distance_m">
  >,
): number {
  return routes.reduce(
    (sum, route) => sum + (resolveRouteElevationGainM(route) ?? 0),
    0,
  );
}
