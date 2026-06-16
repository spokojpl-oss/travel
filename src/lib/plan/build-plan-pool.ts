import { defaultExplorationScope } from "@/lib/search/exploration-scope";
import type { ExplorationScope } from "@/lib/search/exploration-scope";
import { daysBetweenIso } from "@/lib/search/trip-context";
import { distanceKm } from "@/lib/search/geo-clustering";
import {
  dedupeAttractionPool,
  groupNearbyBeaches,
} from "@/lib/plan/attraction-grouping";
import { buildCuratedDayTrips } from "@/lib/plan/curated-day-trips";
import {
  dayTripRadiusKm,
  nearbyStayRadiusKm,
} from "@/lib/plan/day-trip-radius";
import { selectDiverseAttractionIds } from "@/lib/plan/diverse-selection";
import {
  isDayTripAttraction,
  readPlanMeta,
  withPlanMeta,
} from "@/lib/plan/plan-attraction-meta";
import type { AttractionWithActivities, GeoPoint } from "@/types/domain";
import type { Locale } from "@/i18n/config";

function point(a: AttractionWithActivities): GeoPoint {
  return { lat: Number(a.lat), lon: Number(a.lon) };
}

function markNearbyMeta(
  attractions: AttractionWithActivities[],
  basePoint: GeoPoint,
  maxKm: number,
): AttractionWithActivities[] {
  return attractions.map((a) => {
    if (isDayTripAttraction(a)) return a;
    const km = distanceKm(basePoint, point(a));
    if (km > maxKm) {
      return withPlanMeta(a, {
        kind: "day_trip",
        drive_km: Math.round(km * 10) / 10,
        drive_minutes: Math.round((km / 45) * 60 * 1.15),
      });
    }
    const existing = readPlanMeta(a);
    if (existing?.kind) return a;
    return withPlanMeta(a, { kind: "nearby" });
  });
}

export function buildPlanAttractionPool({
  clusterAttractions,
  expandedAttractions,
  destinationLabel,
  touristRegionId,
  explorationScope,
  tripDays,
  basePoint,
  locale = "pl",
}: {
  clusterAttractions: AttractionWithActivities[];
  expandedAttractions?: AttractionWithActivities[];
  destinationLabel: string;
  touristRegionId?: string | null;
  explorationScope?: ExplorationScope | null;
  tripDays: number;
  basePoint: GeoPoint;
  locale?: Locale;
}): {
  pool: AttractionWithActivities[];
  suggestedIds: string[];
} {
  const scope = explorationScope ?? defaultExplorationScope();
  const nearbyKm = nearbyStayRadiusKm(scope);
  const dayTripKm = dayTripRadiusKm(scope, tripDays);

  const byId = new Map<string, AttractionWithActivities>();
  for (const a of [...clusterAttractions, ...(expandedAttractions ?? [])]) {
    byId.set(a.id, a);
  }
  let merged = [...byId.values()];

  merged = dedupeAttractionPool(merged);
  merged = groupNearbyBeaches(merged);

  const curated = buildCuratedDayTrips({
    basePoint,
    destinationLabel,
    currentRegionId: touristRegionId,
    maxRadiusKm: dayTripKm,
    locale,
  });

  for (const c of curated) {
    if (!byId.has(c.id)) merged.push(c);
  }

  merged = markNearbyMeta(merged, basePoint, nearbyKm);

  const pool = merged.sort((a, b) => {
    const aDay = isDayTripAttraction(a) ? 1 : 0;
    const bDay = isDayTripAttraction(b) ? 1 : 0;
    if (aDay !== bDay) return aDay - bDay;
    return distanceKm(basePoint, point(a)) - distanceKm(basePoint, point(b));
  });

  const suggestedIds = selectDiverseAttractionIds(
    pool,
    basePoint,
    Math.min(8, Math.max(5, Math.ceil(tripDays * 0.9))),
  );

  return { pool, suggestedIds };
}

export function tripDaysFromDates(
  departureDate: string,
  returnDate: string | null,
): number {
  return Math.max(
    1,
    daysBetweenIso(departureDate, returnDate ?? departureDate),
  );
}
