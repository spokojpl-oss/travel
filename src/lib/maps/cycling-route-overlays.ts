import type { ActivityRoute } from "@/types/activities";
import { parseRouteGeometry } from "@/lib/supabase/activity-routes";
import { resolveRouteElevationGainM } from "@/lib/activities/cycling/elevation";

export type MapCyclingRouteOverlay = {
  id: string;
  name: string;
  path: Array<{ lat: number; lng: number }>;
  distanceKm: number;
  elevationGainM: number | null;
};

export function cyclingRoutesToMapOverlays(
  routes: ActivityRoute[],
): MapCyclingRouteOverlay[] {
  return routes
    .map((route) => ({
      id: route.id,
      name: route.name,
      path: parseRouteGeometry(route.geometry),
      distanceKm: route.distance_m / 1000,
      elevationGainM: resolveRouteElevationGainM(route),
    }))
    .filter((route) => route.path.length >= 2);
}
