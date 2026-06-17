import type { ActivityCategory, ActivityRoute } from "@/types/activities";
import type { CyclingRouteFilters } from "@/lib/activities/cycling/types";
import {
  ewkbToGeoJson,
  wktLineStringToGeoJson,
  wktPointToGeoJson,
} from "@/lib/activities/cycling/geometry";

export function parseActivityRouteRow(row: ActivityRoute): ActivityRoute {
  return {
    ...row,
    surface_mix:
      row.surface_mix && typeof row.surface_mix === "object"
        ? row.surface_mix
        : null,
    elevation_profile: Array.isArray(row.elevation_profile)
      ? row.elevation_profile
      : null,
    highlights: Array.isArray(row.highlights) ? row.highlights : null,
  };
}

export function buildRoutesQueryParams(
  destinationId: string,
  filters: CyclingRouteFilters,
  limit = 20,
  near?: { lat: number; lng: number; radiusKm: number },
): URLSearchParams {
  const params = new URLSearchParams({ destinationId, limit: String(limit) });
  if (near) {
    params.set("nearLat", String(near.lat));
    params.set("nearLng", String(near.lng));
    params.set("nearRadiusKm", String(near.radiusKm));
  }
  if (filters.activityType) params.set("activityType", filters.activityType);
  if (filters.minDistanceM != null) {
    params.set("minDistanceM", String(filters.minDistanceM));
  }
  if (filters.maxDistanceM != null) {
    params.set("maxDistanceM", String(filters.maxDistanceM));
  }
  if (filters.maxElevationGain != null) {
    params.set("maxElevationGain", String(filters.maxElevationGain));
  }
  if (filters.difficulty?.length) {
    for (const d of filters.difficulty) params.append("difficulty", d);
  }
  return params;
}

export function isActivityCategory(value: string): value is ActivityCategory {
  return ["cycling", "hiking", "running", "water_sports"].includes(value);
}

export function parseRouteGeometry(
  geometry: unknown,
): Array<{ lat: number; lng: number }> {
  if (!geometry) return [];

  let value: unknown = geometry;
  if (typeof geometry === "string") {
    if (geometry.trim().startsWith("{")) {
      try {
        value = JSON.parse(geometry) as unknown;
      } catch {
        /* fall through to WKT / EWKB */
      }
    }
    if (typeof value === "string") {
      const ewkb = ewkbToGeoJson(value);
      if (ewkb?.type === "LineString") {
        return ewkb.coordinates.map(([lng, lat]) => ({ lat, lng }));
      }

      const geo = wktLineStringToGeoJson(value);
      if (geo) {
        return geo.coordinates.map(([lng, lat]) => ({ lat, lng }));
      }
    }
  }

  if (typeof value === "object" && value !== null) {
    const geo = value as {
      type?: string;
      coordinates?: number[][];
    };
    if (geo.type === "LineString" && Array.isArray(geo.coordinates)) {
      return geo.coordinates.map(([lng, lat]) => ({ lat, lng }));
    }
  }

  return [];
}

export function parseRouteStartPoint(
  startPoint: unknown,
): { lat: number; lng: number } | null {
  if (!startPoint) return null;

  if (typeof startPoint === "string") {
    if (startPoint.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(startPoint) as {
          type?: string;
          coordinates?: number[];
        };
        if (parsed.type === "Point" && Array.isArray(parsed.coordinates)) {
          return { lat: parsed.coordinates[1]!, lng: parsed.coordinates[0]! };
        }
      } catch {
        /* fall through */
      }
    }

    const ewkb = ewkbToGeoJson(startPoint);
    if (ewkb?.type === "Point") {
      return { lat: ewkb.coordinates[1], lng: ewkb.coordinates[0] };
    }

    const geo = wktPointToGeoJson(startPoint);
    if (geo) {
      return { lat: geo.coordinates[1], lng: geo.coordinates[0] };
    }
  }

  if (typeof startPoint === "object" && startPoint !== null) {
    const geo = startPoint as { type?: string; coordinates?: number[] };
    if (geo.type === "Point" && Array.isArray(geo.coordinates)) {
      return { lat: geo.coordinates[1]!, lng: geo.coordinates[0]! };
    }
  }

  return null;
}
