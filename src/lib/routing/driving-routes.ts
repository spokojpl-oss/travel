import { getGoogleMapsServerKey } from "@/lib/maps/google-maps-config";
import {
  fetchGoogleDrivingRoute,
  fetchGoogleDrivingRoutes,
} from "@/lib/routing/google-directions";
import {
  fetchDrivingRoute,
  fetchDrivingRoutes,
  type DrivingRoute,
} from "@/lib/routing/osrm";
import type { GeoPoint } from "@/types/domain";

export type ResolvedDrivingRoute = DrivingRoute;

export async function resolveDrivingRoute(
  from: GeoPoint,
  to: GeoPoint,
): Promise<ResolvedDrivingRoute> {
  const googleKey = getGoogleMapsServerKey();
  if (googleKey) {
    const googleRoute = await fetchGoogleDrivingRoute(from, to, googleKey);
    if (googleRoute) return googleRoute;
  }

  const fallback = await fetchDrivingRoute(from, to);
  return fallback;
}

export async function resolveDrivingRoutes(
  segments: Array<{ id: string; from: GeoPoint; to: GeoPoint }>,
): Promise<Array<{ id: string; route: ResolvedDrivingRoute }>> {
  const googleKey = getGoogleMapsServerKey();

  if (googleKey) {
    const googleRoutes = await fetchGoogleDrivingRoutes(segments, googleKey);
    if (googleRoutes.length === segments.length) {
      return googleRoutes;
    }

    const googleById = new Map(googleRoutes.map((r) => [r.id, r.route]));
    const results: Array<{ id: string; route: ResolvedDrivingRoute }> = [];

    for (const segment of segments) {
      const existing = googleById.get(segment.id);
      if (existing) {
        results.push({ id: segment.id, route: existing });
      } else {
        const fallback = await fetchDrivingRoute(segment.from, segment.to);
        results.push({ id: segment.id, route: fallback });
      }
    }
    return results;
  }

  return fetchDrivingRoutes(segments);
}
