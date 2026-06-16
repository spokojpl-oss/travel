import { distanceKm } from "@/lib/search/geo-clustering";
import type { ExplorationScope } from "@/lib/search/exploration-scope";
import { isBeachAttraction } from "@/lib/plan/attraction-grouping";
import { compareByScore } from "@/lib/plan/attraction-scoring";
import { allowsDayTrips } from "@/lib/plan/day-trip-radius";
import {
  isDayTripAttraction,
  readPlanMeta,
} from "@/lib/plan/plan-attraction-meta";
import type { AttractionWithActivities, GeoPoint } from "@/types/domain";

function point(a: AttractionWithActivities): GeoPoint {
  return { lat: Number(a.lat), lon: Number(a.lon) };
}

function primarySlug(a: AttractionWithActivities): string {
  const sorted = [...a.activity_tags].sort(
    (x, y) => (y.confidence ?? 0) - (x.confidence ?? 0),
  );
  return sorted[0]?.activity_slug ?? a.category ?? "other";
}

function isKidFriendly(a: AttractionWithActivities): boolean {
  if (a.min_age == null) return true;
  return a.min_age <= 12;
}

export function suggestedCountForTrip(
  tripDays: number,
  scope: ExplorationScope = "region",
): number {
  const bonus =
    scope === "roadtrip" ? 3 : scope === "island" ? 2 : scope === "local" ? 0 : 1;
  return Math.min(20, Math.max(3, tripDays + bonus));
}

export function maxDayTripsForScope(
  scope: ExplorationScope,
  maxCount: number,
): number {
  if (!allowsDayTrips(scope)) return 0;
  switch (scope) {
    case "region":
      return Math.min(2, Math.ceil(maxCount / 4));
    case "island":
      return Math.min(3, Math.ceil(maxCount / 3));
    case "roadtrip":
      return Math.min(5, Math.ceil(maxCount / 2));
    default:
      return 0;
  }
}

function maxBeachesForScope(
  scope: ExplorationScope,
  preferredActivities: string[],
): number {
  const wantsBeach = preferredActivities.some((s) =>
    /beach|plaż/i.test(s),
  );
  if (scope === "local") return wantsBeach ? 2 : 1;
  if (scope === "roadtrip" || scope === "island") return wantsBeach ? 3 : 2;
  return wantsBeach ? 2 : 1;
}

export type DiverseSelectionOptions = {
  maxCount?: number;
  explorationScope?: ExplorationScope;
  preferredActivities?: string[];
  withKids?: boolean;
  tripDays?: number;
};

/** Domyślny wybór: mix typów + wycieczki dojazdowe + limit plaż zależny od scope. */
export function selectDiverseAttractionIds(
  pool: AttractionWithActivities[],
  basePoint: GeoPoint,
  maxCountOrOptions: number | DiverseSelectionOptions = 8,
): string[] {
  const options: DiverseSelectionOptions =
    typeof maxCountOrOptions === "number"
      ? { maxCount: maxCountOrOptions }
      : maxCountOrOptions;

  const scope = options.explorationScope ?? "region";
  const preferredActivities = options.preferredActivities ?? [];
  const withKids = options.withKids ?? false;
  const maxCount =
    options.maxCount ??
    suggestedCountForTrip(options.tripDays ?? 5, scope);

  let candidates = pool;
  if (withKids) {
    candidates = candidates.filter(isKidFriendly);
  }

  const dayTrips = candidates
    .filter(isDayTripAttraction)
    .sort(
      (a, b) =>
        (readPlanMeta(a)?.drive_km ?? 999) - (readPlanMeta(b)?.drive_km ?? 999),
    );

  const nearby = candidates
    .filter((a) => !isDayTripAttraction(a))
    .sort((a, b) => compareByScore(a, b, basePoint, preferredActivities));

  const selected: AttractionWithActivities[] = [];
  const usedSlugs = new Set<string>();
  let beachCount = 0;
  const maxBeaches = maxBeachesForScope(scope, preferredActivities);
  const maxDayTrips = maxDayTripsForScope(scope, maxCount);

  const tryAdd = (a: AttractionWithActivities) => {
    if (selected.length >= maxCount) return;
    if (selected.some((s) => s.id === a.id)) return;
    const slug = primarySlug(a);
    if (isBeachAttraction(a)) {
      if (beachCount >= maxBeaches && !readPlanMeta(a)?.group_size) return;
      beachCount += 1;
    } else if (usedSlugs.has(slug) && !isDayTripAttraction(a)) {
      return;
    }
    usedSlugs.add(slug);
    selected.push(a);
  };

  for (const dt of dayTrips.slice(0, maxDayTrips)) {
    tryAdd(dt);
  }

  for (const a of nearby) {
    if (selected.length >= maxCount) break;
    tryAdd(a);
  }

  if (selected.length < maxCount) {
    const rest = [...candidates].sort((a, b) =>
      compareByScore(a, b, basePoint, preferredActivities),
    );
    for (const a of rest) {
      if (selected.length >= maxCount) break;
      tryAdd(a);
    }
  }

  return selected.map((a) => a.id);
}
