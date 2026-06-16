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
  exploreRadiusKm,
  stayRadiusKm,
  driveMinutesFromKm,
} from "@/lib/plan/day-trip-radius";
import {
  selectDiverseAttractionIds,
  suggestedCountForTrip,
  type DiverseSelectionOptions,
} from "@/lib/plan/diverse-selection";
import {
  isDayTripAttraction,
  readPlanMeta,
  withPlanMeta,
} from "@/lib/plan/plan-attraction-meta";
import type { TouristRegion } from "@/lib/destinations/tourist-regions";
import type { AttractionWithActivities, GeoPoint } from "@/types/domain";
import type { Locale } from "@/i18n/config";

function point(a: AttractionWithActivities): GeoPoint {
  return { lat: Number(a.lat), lon: Number(a.lon) };
}

/** Surowy pool bez metadanych odległości od bazy — budowany po stronie API. */
export function buildRawPlanAttractionPool({
  clusterAttractions,
  expandedAttractions,
  destinationLabel,
  touristRegionId,
  touristRegionIds,
  explorationScope,
  tripDays,
  referencePoint,
  locale = "pl",
  catalog,
  preferredActivities,
}: {
  clusterAttractions: AttractionWithActivities[];
  expandedAttractions?: AttractionWithActivities[];
  destinationLabel: string;
  touristRegionId?: string | null;
  touristRegionIds?: string[] | null;
  explorationScope?: ExplorationScope | null;
  tripDays: number;
  /** Punkt odniesienia do kuracji i filtrowania (centrum klastra). */
  referencePoint: GeoPoint;
  locale?: Locale;
  catalog: TouristRegion[];
  preferredActivities?: string[];
}): AttractionWithActivities[] {
  const scope = explorationScope ?? defaultExplorationScope();
  const exploreKm = exploreRadiusKm(scope, tripDays);

  const selectedRegionIds =
    touristRegionIds && touristRegionIds.length > 0
      ? touristRegionIds
      : touristRegionId
        ? [touristRegionId]
        : [];

  const byId = new Map<string, AttractionWithActivities>();
  for (const a of [...clusterAttractions, ...(expandedAttractions ?? [])]) {
    byId.set(a.id, a);
  }
  let merged = [...byId.values()];

  merged = dedupeAttractionPool(
    merged,
    1.2,
    referencePoint,
    preferredActivities,
  );
  merged = groupNearbyBeaches(merged, 2.5, referencePoint);

  /** Wybrane rejony = baza; bez sztucznych wycieczek z innych części wyspy. */
  if (selectedRegionIds.length === 0) {
    const curated = buildCuratedDayTrips({
      basePoint: referencePoint,
      destinationLabel,
      currentRegionId: touristRegionId,
      maxRadiusKm: exploreKm,
      locale,
      catalog,
      existingPool: merged,
      explorationScope: scope,
    });

    for (const c of curated) {
      if (!byId.has(c.id)) merged.push(c);
    }
  }

  return merged;
}

/** Oznacza atrakcje jako nearby / day_trip względem wybranej bazy noclegowej. */
export function applyPlanMetaToPool(
  pool: AttractionWithActivities[],
  basePoint: GeoPoint,
  explorationScope: ExplorationScope,
  tripDays: number,
): AttractionWithActivities[] {
  const stayKm = stayRadiusKm(explorationScope);

  const marked = pool.map((a) => {
    const existing = readPlanMeta(a);
    if (existing?.curated || existing?.kind === "grouped_beach") {
      const km = distanceKm(basePoint, point(a));
      if (existing.kind === "day_trip") {
        return withPlanMeta(a, {
          ...existing,
          drive_km: Math.round(km * 10) / 10,
          drive_minutes: driveMinutesFromKm(km),
        });
      }
      return a;
    }

    const km = distanceKm(basePoint, point(a));
    if (km > stayKm) {
      return withPlanMeta(a, {
        kind: "day_trip",
        drive_km: Math.round(km * 10) / 10,
        drive_minutes: driveMinutesFromKm(km),
      });
    }
    if (existing?.kind) return a;
    return withPlanMeta(a, { kind: "nearby" });
  });

  return marked.sort((a, b) => {
    const aDay = isDayTripAttraction(a) ? 1 : 0;
    const bDay = isDayTripAttraction(b) ? 1 : 0;
    if (aDay !== bDay) return aDay - bDay;
    return distanceKm(basePoint, point(a)) - distanceKm(basePoint, point(b));
  });
}

export function computePlanSuggestions(
  poolWithMeta: AttractionWithActivities[],
  basePoint: GeoPoint,
  options: DiverseSelectionOptions,
): string[] {
  const scope = options.explorationScope ?? "region";
  const maxCount =
    options.maxCount ?? suggestedCountForTrip(options.tripDays ?? 5, scope);

  return selectDiverseAttractionIds(poolWithMeta, basePoint, {
    ...options,
    maxCount,
  });
}

/** @deprecated Użyj buildRawPlanAttractionPool + applyPlanMetaToPool po wyborze bazy. */
export function buildPlanAttractionPool(params: {
  clusterAttractions: AttractionWithActivities[];
  expandedAttractions?: AttractionWithActivities[];
  destinationLabel: string;
  touristRegionId?: string | null;
  explorationScope?: ExplorationScope | null;
  tripDays: number;
  basePoint: GeoPoint;
  locale?: Locale;
  catalog: TouristRegion[];
  preferredActivities?: string[];
  withKids?: boolean;
}): {
  pool: AttractionWithActivities[];
  suggestedIds: string[];
} {
  const scope = params.explorationScope ?? defaultExplorationScope();
  const raw = buildRawPlanAttractionPool({
    ...params,
    referencePoint: params.basePoint,
  });
  const pool = applyPlanMetaToPool(
    raw,
    params.basePoint,
    scope,
    params.tripDays,
  );
  const suggestedIds = computePlanSuggestions(pool, params.basePoint, {
    explorationScope: scope,
    tripDays: params.tripDays,
    preferredActivities: params.preferredActivities,
    withKids: params.withKids,
  });
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
