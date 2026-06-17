import type { ActivityCategory, ActivityRoute } from "@/types/activities";
import type { CyclingRouteFilters } from "@/lib/activities/cycling/types";

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
): URLSearchParams {
  const params = new URLSearchParams({ destinationId, limit: String(limit) });
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

  if (typeof geometry === "string") {
    const wktMatch = geometry.match(/LINESTRING\s*\(([^)]+)\)/i);
    if (wktMatch) {
      return wktMatch[1]!.split(",").map((pair) => {
        const [lng, lat] = pair.trim().split(/\s+/).map(Number);
        return { lat, lng };
      });
    }
  }

  if (typeof geometry === "object" && geometry !== null) {
    const geo = geometry as {
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
    const match = startPoint.match(/POINT\s*\(([^)]+)\)/i);
    if (match) {
      const [lng, lat] = match[1]!.trim().split(/\s+/).map(Number);
      return { lat, lng };
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
