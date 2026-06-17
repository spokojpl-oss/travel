import { distanceKm } from "@/lib/search/geo-clustering";
import { parseRouteGeometry, parseRouteStartPoint } from "@/lib/supabase/activity-routes";
import type { ActivityRoute } from "@/types/activities";
import type { GeoPoint } from "@/types/domain";
import { DEFAULT_REGION_RADIUS_KM } from "@/lib/activities/cycling/generate-batch";
import {
  type CyclingRouteRegionTarget,
} from "@/lib/activities/cycling/route-distribution";
import type { CyclingRegionCenter } from "@/lib/activities/cycling/types";

export type RouteTerrain = "coastal" | "inland";

const INLAND_NAME_MARKERS = / · ląd\b| · inland\b/i;
const KM_PER_DEG_LAT = 111.32;

/** Na każde 2 trasy przy morzu — 1 w głąb lądu (przy małej liczbie tras tylko nadbrzeże). */
export function splitCoastalInlandCounts(total: number): {
  coastal: number;
  inland: number;
} {
  if (total < 3) return { coastal: total, inland: 0 };
  let inland = Math.floor(total / 3);
  const coastal = total - inland;
  const maxInland = Math.floor(coastal / 2);
  if (inland > maxInland) inland = maxInland;
  return { coastal: total - inland, inland };
}

export function offsetPointKm(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceKm: number,
): { lat: number; lng: number } {
  const brng = (bearingDeg * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const dLat = (distanceKm * Math.cos(brng)) / KM_PER_DEG_LAT;
  const dLng =
    (distanceKm * Math.sin(brng)) /
    (KM_PER_DEG_LAT * Math.max(0.25, Math.cos(latRad)));
  return { lat: lat + dLat, lng: lng + dLng };
}

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function bearingDeg(from: GeoPoint, to: GeoPoint): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLon = ((to.lon - from.lon) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Punkt startowy tras lądowych — w głąb od plaż / centrum nadmorskiego. */
export function computeInlandCenter(
  coastalCenter: { lat: number; lng: number },
  radiusKm: number,
  options?: {
    seed?: string;
    beaches?: GeoPoint[];
  },
): { lat: number; lng: number } {
  const offsetKm = Math.min(
    Math.max(radiusKm * 0.55, 12),
    Math.round(radiusKm * 0.7),
  );

  if (options?.beaches && options.beaches.length > 0) {
    const beachCentroid = {
      lat:
        options.beaches.reduce((s, b) => s + b.lat, 0) /
        options.beaches.length,
      lon:
        options.beaches.reduce((s, b) => s + b.lon, 0) /
        options.beaches.length,
    };
    const awayFromBeach = bearingDeg(
      beachCentroid,
      { lat: coastalCenter.lat, lon: coastalCenter.lng },
    );
    return offsetPointKm(
      coastalCenter.lat,
      coastalCenter.lng,
      awayFromBeach,
      offsetKm,
    );
  }

  const bearing = options?.seed
    ? hashSeed(options.seed) % 360
    : Math.round(coastalCenter.lat * 1000 + coastalCenter.lng * 1000) % 360;
  return offsetPointKm(coastalCenter.lat, coastalCenter.lng, bearing, offsetKm);
}

export function classifyRouteTerrain(
  route: ActivityRoute,
  coastalCenter: { lat: number; lng: number },
  radiusKm: number,
  beaches: GeoPoint[] = [],
): RouteTerrain {
  if (INLAND_NAME_MARKERS.test(route.name)) return "inland";

  const start = parseRouteStartPoint(route);
  if (!start) return "coastal";
  const startPoint: GeoPoint = { lat: start.lat, lon: start.lng };

  if (beaches.length > 0) {
    const nearestBeachKm = Math.min(
      ...beaches.map((b) => distanceKm(startPoint, b)),
    );
    if (nearestBeachKm <= 5) return "coastal";
    if (nearestBeachKm >= 12) return "inland";
  }

  const inlandCenter = computeInlandCenter(
    { lat: coastalCenter.lat, lng: coastalCenter.lng },
    radiusKm,
  );
  const toCoastal = distanceKm(startPoint, {
    lat: coastalCenter.lat,
    lon: coastalCenter.lng,
  });
  const toInland = distanceKm(startPoint, {
    lat: inlandCenter.lat,
    lon: inlandCenter.lng,
  });
  return toInland + 4 < toCoastal ? "inland" : "coastal";
}

export function expandRegionTargetsWithTerrain(
  targets: CyclingRouteRegionTarget[],
  beachesByRegion?: Map<string, GeoPoint[]>,
  options?: { useCoastalSplit?: boolean },
): CyclingRouteRegionTarget[] {
  const useCoastalSplit = options?.useCoastalSplit !== false;

  return targets.flatMap((target) => {
    if (target.terrain === "inland" || target.terrain === "coastal") {
      return [target];
    }

    if (!useCoastalSplit) {
      return [target];
    }

    const { coastal, inland } = splitCoastalInlandCounts(target.count);
    const regionKey = target.label ?? `${target.centerLat},${target.centerLng}`;
    const beaches = beachesByRegion?.get(regionKey) ?? [];

    const coastalTarget: CyclingRouteRegionTarget = {
      ...target,
      count: coastal,
      terrain: "coastal",
    };

    if (inland === 0) return [coastalTarget];

    const inlandCenter = computeInlandCenter(
      { lat: target.centerLat, lng: target.centerLng },
      target.maxRadiusKm ?? DEFAULT_REGION_RADIUS_KM,
      { seed: regionKey, beaches },
    );

    return [
      coastalTarget,
      {
        ...target,
        centerLat: inlandCenter.lat,
        centerLng: inlandCenter.lng,
        count: inland,
        terrain: "inland",
        label: target.label ? `${target.label} · ląd` : "ląd",
      },
    ];
  });
}

type RegionPoint = {
  lat: number;
  lng: number;
  radiusKm: number;
  label?: string;
  id?: string;
};

function beachesForRegion(
  region: RegionPoint,
  allBeaches: GeoPoint[],
): GeoPoint[] {
  if (allBeaches.length === 0) return [];
  return allBeaches.filter(
    (b) =>
      distanceKm(b, { lat: region.lat, lon: region.lng }) <=
      region.radiusKm + 6,
  );
}

/** Uzupełnia brakujące trasy z zachowaniem proporcji 2:1 (morze:ląd) w każdym rejonie. */
export function buildTerrainAwareTopUpTargets(
  routes: ActivityRoute[],
  regionCenters: CyclingRegionCenter[],
  targetTotal: number,
  allBeaches: GeoPoint[] = [],
  options?: { useCoastalSplit?: boolean },
): CyclingRouteRegionTarget[] {
  if (regionCenters.length === 0) return [];

  const useCoastalSplit = options?.useCoastalSplit !== false;

  const perRegionDesired = Array.from(
    { length: regionCenters.length },
    (_, i) => {
      const base = Math.floor(targetTotal / regionCenters.length);
      const extra = i < targetTotal % regionCenters.length ? 1 : 0;
      return base + extra;
    },
  );

  const regions: RegionPoint[] = regionCenters.map((region) => ({
    lat: region.lat,
    lng: region.lng,
    radiusKm: region.radiusKm ?? DEFAULT_REGION_RADIUS_KM,
    label: region.label,
    id: region.id,
  }));

  const targets: CyclingRouteRegionTarget[] = [];

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i]!;
    const beaches = beachesForRegion(region, allBeaches);
    const coastalCenter = { lat: region.lat, lng: region.lng };

    const inRegion = routes.filter((route) => {
      const start = parseRouteStartPoint(route);
      if (!start) return false;
      const startPoint: GeoPoint = { lat: start.lat, lon: start.lng };
      const path = parseRouteGeometry(route.geometry);
      const distToCenter = distanceKm(startPoint, {
        lat: region.lat,
        lon: region.lng,
      });
      return (
        distToCenter <= region.radiusKm + 8 ||
        path.some(
          (p) =>
            distanceKm({ lat: p.lat, lon: p.lng }, {
              lat: region.lat,
              lon: region.lng,
            }) <= region.radiusKm + 4,
        )
      );
    });

    let coastal = 0;
    let inland = 0;
    for (const route of inRegion) {
      if (
        classifyRouteTerrain(route, coastalCenter, region.radiusKm, beaches) ===
        "inland"
      ) {
        inland += 1;
      } else {
        coastal += 1;
      }
    }

    const desiredTotal = perRegionDesired[i] ?? 0;

    if (!useCoastalSplit) {
      const need = Math.max(0, desiredTotal - inRegion.length);
      if (need > 0) {
        targets.push({
          centerLat: region.lat,
          centerLng: region.lng,
          count: need,
          maxRadiusKm: region.radiusKm,
          label: region.label,
        });
      }
      continue;
    }

    const { coastal: targetCoastal, inland: targetInland } =
      splitCoastalInlandCounts(Math.max(desiredTotal, coastal + inland));

    const requiredInlandFromRatio = Math.floor(coastal / 2);
    const needInland = Math.max(
      0,
      Math.max(targetInland, requiredInlandFromRatio) - inland,
    );
    const needCoastal = Math.max(0, targetCoastal - coastal);

    if (needCoastal > 0) {
      targets.push({
        centerLat: region.lat,
        centerLng: region.lng,
        count: needCoastal,
        maxRadiusKm: region.radiusKm,
        label: region.label,
        terrain: "coastal",
      });
    }

    if (needInland > 0) {
      const inlandCenter = computeInlandCenter(coastalCenter, region.radiusKm, {
        seed: region.label ?? region.id ?? `${region.lat},${region.lng}`,
        beaches,
      });
      targets.push({
        centerLat: inlandCenter.lat,
        centerLng: inlandCenter.lng,
        count: needInland,
        maxRadiusKm: region.radiusKm,
        label: region.label ? `${region.label} · ląd` : "ląd",
        terrain: "inland",
      });
    }
  }

  return targets;
}

export function inlandScrapeCentersFromRegions(
  regionCenters: CyclingRegionCenter[],
  allBeaches: GeoPoint[] = [],
): Array<{ lat: number; lng: number; radiusKm: number; label?: string }> {
  return regionCenters.map((region) => {
    const radiusKm = region.radiusKm ?? DEFAULT_REGION_RADIUS_KM;
    const beaches = beachesForRegion(
      { lat: region.lat, lng: region.lng, radiusKm, label: region.label },
      allBeaches,
    );
    const inland = computeInlandCenter(
      { lat: region.lat, lng: region.lng },
      radiusKm,
      {
        seed: region.label ?? region.id ?? `${region.lat},${region.lng}`,
        beaches,
      },
    );
    return {
      lat: inland.lat,
      lng: inland.lng,
      radiusKm,
      label: region.label ? `${region.label} · ląd` : "ląd",
    };
  });
}
