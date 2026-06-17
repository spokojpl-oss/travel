import { distanceKm } from "@/lib/search/geo-clustering";
import { parseRouteGeometry } from "@/lib/supabase/activity-routes";
import type { ActivityRoute } from "@/types/activities";

function routeStartKey(route: ActivityRoute): string | null {
  const path = parseRouteGeometry(route.geometry);
  if (path.length === 0) return null;
  const p = path[0]!;
  return `${Math.round(p.lat * 200)}:${Math.round(p.lng * 200)}`;
}

/** Usuwa duplikaty tras (ta sama długość, typ i start w okolicy). */
export function dedupeCyclingRoutes(routes: ActivityRoute[]): ActivityRoute[] {
  const kept: ActivityRoute[] = [];

  for (const route of routes) {
    const startKey = routeStartKey(route);
    const distanceBucket = Math.round(route.distance_m / 400) * 400;

    const duplicate = kept.some((existing) => {
      if (existing.activity_type !== route.activity_type) return false;
      const existingBucket = Math.round(existing.distance_m / 400) * 400;
      if (existingBucket !== distanceBucket) return false;

      const existingStart = routeStartKey(existing);
      if (!startKey || !existingStart) {
        return existing.name === route.name;
      }
      if (startKey === existingStart) return true;

      const path = parseRouteGeometry(route.geometry);
      const existingPath = parseRouteGeometry(existing.geometry);
      if (path.length === 0 || existingPath.length === 0) return false;
      return (
        distanceKm(
          { lat: path[0]!.lat, lon: path[0]!.lng },
          { lat: existingPath[0]!.lat, lon: existingPath[0]!.lng },
        ) < 1.5
      );
    });

    if (!duplicate) kept.push(route);
  }

  return kept;
}
