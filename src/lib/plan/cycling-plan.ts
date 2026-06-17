import { distanceKm } from "@/lib/search/geo-clustering";
import { parseRouteGeometry } from "@/lib/supabase/activity-routes";
import {
  computeLodgingAreaOptions,
  type LodgingAreaOption,
} from "@/lib/plan/lodging-sub-areas";
import {
  pointInTouristRegion,
  regionCenter,
} from "@/lib/plan/tourist-region-anchor";
import type { PlaceCard } from "@/lib/plan/build-discover-places";
import type { ActivityRoute } from "@/types/activities";
import type { AttractionWithActivities, GeoPoint } from "@/types/domain";
import type { TouristRegion } from "@/lib/destinations/tourist-regions";

export const BEACH_ACTIVITY_SLUGS = ["sandy_beaches", "rocky_beaches"] as const;

const COASTAL_HINT_RE =
  /plaż|morz|zatok|port|nadmorz|wybrzeż|beach|sea|coast|harbour|harbor|bay|waterfront/i;

const NEAR_BEACH_KM = 4;
const NEAR_ROUTE_KM = 3;

export function wantsBeaches(activities: string[]): boolean {
  return activities.some((slug) =>
    (BEACH_ACTIVITY_SLUGS as readonly string[]).includes(slug),
  );
}

export function isBeachAttraction(attraction: AttractionWithActivities): boolean {
  const slugs = attraction.activity_tags?.map((a) => a.activity_slug) ?? [];
  if (slugs.some((s) => (BEACH_ACTIVITY_SLUGS as readonly string[]).includes(s))) {
    return true;
  }
  const name = attraction.name.toLowerCase();
  return /plaż|beach|bay|cala\b|caló\b/i.test(name);
}

export function beachAttractionsFromPool(
  pool: AttractionWithActivities[],
  preferredActivities: string[],
  regions: TouristRegion[],
): AttractionWithActivities[] {
  if (!wantsBeaches(preferredActivities)) return [];
  let beaches = pool.filter(isBeachAttraction);
  if (regions.length > 0) {
    beaches = beaches.filter((a) =>
      regions.some((r) =>
        pointInTouristRegion(
          { lat: Number(a.lat), lon: Number(a.lon) },
          r,
          4,
        ),
      ),
    );
  }
  return beaches;
}

export function minDistanceKmToPath(
  point: GeoPoint,
  path: Array<{ lat: number; lng: number }>,
): number {
  if (path.length === 0) return Infinity;
  let min = Infinity;
  for (const p of path) {
    const d = distanceKm(point, { lat: p.lat, lon: p.lng });
    if (d < min) min = d;
  }
  return min;
}

export function routeStartPoint(route: ActivityRoute): GeoPoint | null {
  const path = parseRouteGeometry(route.geometry);
  if (path.length === 0) return null;
  const first = path[0]!;
  return { lat: first.lat, lon: first.lng };
}

export type RouteBeachProximity = {
  routeId: string;
  beachId: string;
  beachName: string;
  distanceKm: number;
};

export function nearestBeachToRoute(
  route: ActivityRoute,
  beaches: AttractionWithActivities[],
  maxKm = NEAR_BEACH_KM,
): RouteBeachProximity | null {
  const path = parseRouteGeometry(route.geometry);
  if (path.length === 0 || beaches.length === 0) return null;

  let best: RouteBeachProximity | null = null;
  for (const beach of beaches) {
    const point = { lat: Number(beach.lat), lon: Number(beach.lon) };
    const d = minDistanceKmToPath(point, path);
    if (d > maxKm) continue;
    if (!best || d < best.distanceKm) {
      best = {
        routeId: route.id,
        beachId: beach.id,
        beachName: beach.name,
        distanceKm: Math.round(d * 10) / 10,
      };
    }
  }
  return best;
}

export function rankRoutesForBeaches(
  routes: ActivityRoute[],
  beaches: AttractionWithActivities[],
): ActivityRoute[] {
  if (beaches.length === 0) return routes;
  return [...routes].sort((a, b) => {
    const da = nearestBeachToRoute(a, beaches)?.distanceKm ?? Infinity;
    const db = nearestBeachToRoute(b, beaches)?.distanceKm ?? Infinity;
    return da - db;
  });
}

export function routeBeachHints(
  routes: ActivityRoute[],
  beaches: AttractionWithActivities[],
): Map<string, RouteBeachProximity> {
  const hints = new Map<string, RouteBeachProximity>();
  for (const route of routes) {
    const hit = nearestBeachToRoute(route, beaches);
    if (hit) hints.set(route.id, hit);
  }
  return hints;
}

export function routeInRegion(
  route: ActivityRoute,
  region: TouristRegion,
  marginKm = 3,
): boolean {
  const start = routeStartPoint(route);
  if (!start) return false;
  return pointInTouristRegion(start, region, marginKm);
}

export function isCoastalLodgingHint(text: string): boolean {
  return COASTAL_HINT_RE.test(text);
}

export type CyclingLodgingScore = {
  option: LodgingAreaOption;
  score: number;
  reasonPl: string;
  reasonEn: string;
};

export function scoreCyclingLodgingOption(
  option: LodgingAreaOption,
  routes: ActivityRoute[],
  beaches: AttractionWithActivities[],
  regions: TouristRegion[],
  locale: "pl" | "en",
): CyclingLodgingScore {
  const pl = locale !== "en";
  const description = pl ? option.description_pl : option.description_en;
  const origin = { lat: option.lat, lon: option.lon };
  let score = 0;
  const reasonsPl: string[] = [];
  const reasonsEn: string[] = [];

  const parentRegion =
    regions.find((r) => r.id === option.parentRegion.id) ?? null;

  const regionRoutes = parentRegion
    ? routes.filter((r) => routeInRegion(r, parentRegion))
    : routes;

  if (isCoastalLodgingHint(description) || isCoastalLodgingHint(option.name)) {
    score += 30;
    reasonsPl.push("blisko morza");
    reasonsEn.push("near the sea");
  }

  if (regionRoutes.length > 0) {
    const routeDists = regionRoutes.map((r) => {
      const start = routeStartPoint(r);
      return start ? distanceKm(origin, start) : Infinity;
    });
    const nearestRoute = Math.min(...routeDists);
    if (nearestRoute < 12) {
      score += 25 - nearestRoute;
      reasonsPl.push(`start tras ~${nearestRoute.toFixed(0)} km`);
      reasonsEn.push(`route starts ~${nearestRoute.toFixed(0)} km away`);
    }
  }

  if (beaches.length > 0) {
    const beachDists = beaches.map((b) =>
      distanceKm(origin, { lat: Number(b.lat), lon: Number(b.lon) }),
    );
    const nearestBeach = Math.min(...beachDists);
    if (nearestBeach < 8) {
      score += 20 - nearestBeach;
      reasonsPl.push(`plaża ~${nearestBeach.toFixed(0)} km`);
      reasonsEn.push(`beach ~${nearestBeach.toFixed(0)} km`);
    }
  }

  return {
    option,
    score,
    reasonPl: reasonsPl.join(" · ") || "w wybranym rejonie tras",
    reasonEn: reasonsEn.join(" · ") || "in your route region",
  };
}

export function buildCyclingLodgingOptions(
  regions: TouristRegion[],
  options: {
    attractions?: AttractionWithActivities[];
    locale?: "pl" | "en";
    stayRadiusKm?: number;
    routes?: ActivityRoute[];
  },
): LodgingAreaOption[] {
  if (regions.length === 0) return [];
  const perRegion = regions.flatMap((region) =>
    computeLodgingAreaOptions([region], {
      attractions: options.attractions,
      locale: options.locale,
      stayRadiusKm: options.stayRadiusKm,
    }),
  );
  const routes = options.routes ?? [];
  if (routes.length === 0) return perRegion;

  const scored = perRegion.map((o) =>
    scoreCyclingLodgingOption(
      o,
      routes,
      options.attractions?.filter(isBeachAttraction) ?? [],
      regions,
      options.locale ?? "pl",
    ),
  );
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.option);
}

export type CyclingTripAdvice = {
  level: "info" | "warning";
  titlePl: string;
  titleEn: string;
  bodyPl: string;
  bodyEn: string;
  suggestsCar: boolean;
  suggestsMultiBase: boolean;
  minBasesRecommended: number;
};

export function assessCyclingTripLogistics({
  regions,
  routes,
  tripDays,
  hasRentalCar,
  beachCount,
}: {
  regions: TouristRegion[];
  routes: ActivityRoute[];
  tripDays: number;
  hasRentalCar?: boolean;
  beachCount?: number;
}): CyclingTripAdvice | null {
  if (regions.length < 2) return null;

  const regionsWithRoutes = regions.filter((r) =>
    routes.some((route) => routeInRegion(route, r)),
  );
  if (regionsWithRoutes.length < 2 && routes.length < 2) return null;

  const spreadKm =
    regionsWithRoutes.length >= 2
      ? Math.max(
          ...regionsWithRoutes.flatMap((a) =>
            regionsWithRoutes.map((b) =>
              distanceKm(regionCenter(a), regionCenter(b)),
            ),
          ),
        )
      : 0;

  const needsLogistics = regionsWithRoutes.length >= 2 || regions.length >= 3;
  if (!needsLogistics) return null;

  const nightsPerRegion = Math.floor(tripDays / Math.max(regions.length, 1));
  const suggestsMultiBase = regions.length >= 2 && nightsPerRegion < 3;
  const suggestsCar =
    !hasRentalCar &&
    (spreadKm > 20 || regionsWithRoutes.length >= 2 || (beachCount ?? 0) > 0);

  const minBases = suggestsMultiBase
    ? Math.min(regionsWithRoutes.length || regions.length, 2)
    : 1;

  const regionNamesPl = regions.map((r) => r.name_pl).join(", ");
  const regionNamesEn = regions.map((r) => r.name_en).join(", ");

  if (suggestsCar && suggestsMultiBase) {
    return {
      level: "warning",
      titlePl: "Kilka rejonów na rowerze — zaplanuj logistykę",
      titleEn: "Several cycling regions — plan logistics",
      bodyPl: `Wybrałeś trasy w ${regionsWithRoutes.length || regions.length} rejonach (${regionNamesPl}). Realnie: auto na transfery między odcinkami albo ${minBases} bazy noclegowe (np. zmiana bazy co kilka dni). Lotnisko zostaje jedno — licz dojazd z wybranej bazy.`,
      bodyEn: `You picked routes across ${regionsWithRoutes.length || regions.length} regions (${regionNamesEn}). Practically: a car for transfers between segments, or ${minBases} lodging bases (e.g. switch every few days). Keep one airport — factor drive time from your base.`,
      suggestsCar: true,
      suggestsMultiBase: true,
      minBasesRecommended: minBases,
    };
  }

  if (suggestsCar) {
    return {
      level: "info",
      titlePl: "Trasy w kilku rejonach — auto się przyda",
      titleEn: "Routes in several regions — a car helps",
      bodyPl: `Rowery w ${regionsWithRoutes.length || regions.length} rejonach to ok. 40–60 km dziennie, ale dojazd między startami tras (i po plażach) będzie wygodniejszy samochodem${hasRentalCar ? " — masz już wynajem w planie" : " — rozważ wynajem na miejscu"}.`,
      bodyEn: `Cycling in ${regionsWithRoutes.length || regions.length} regions works. Expect 40–60 km daily, but driving between route starts (and beaches) is easier by car${hasRentalCar ? " — rental already in your plan" : " — consider local rental"}.`,
      suggestsCar: true,
      suggestsMultiBase: false,
      minBasesRecommended: 1,
    };
  }

  return {
    level: "info",
    titlePl: "Wiele rejonów — jedna baza możliwa, ale ciasno",
    titleEn: "Multiple regions — one base is tight",
    bodyPl: `Przy ${tripDays} dniach i ${regions.length} rejonach rozważ 2 bazy noclegowe blisko morza — bliżej startów tras i plaż. Ty wybierasz, które trasy i którą bazę zostawić.`,
    bodyEn: `With ${tripDays} days and ${regions.length} regions, consider 2 coastal bases — closer to route starts and beaches. You choose which routes and base to keep.`,
    suggestsCar: false,
    suggestsMultiBase: true,
    minBasesRecommended: minBases,
  };
}

export function enhanceDiscoverForCycling({
  discover,
  routes,
  beaches,
  regions,
}: {
  discover: { placeCards: PlaceCard[]; suggestedIds: string[]; story: unknown };
  routes: ActivityRoute[];
  beaches: AttractionWithActivities[];
  regions: TouristRegion[];
}): { placeCards: PlaceCard[]; suggestedIds: string[] } {
  if (beaches.length === 0 && routes.length === 0) {
    return {
      placeCards: discover.placeCards,
      suggestedIds: discover.suggestedIds,
    };
  }

  const beachIds = new Set(beaches.map((b) => b.id));
  const beachCardIds = new Set(
    discover.placeCards
      .filter(
        (c) =>
          beachIds.has(c.id) ||
          /plaż|beach/i.test(c.name) ||
          c.theme === "beach_relax",
      )
      .map((c) => c.id),
  );

  const routeLinkedBeachIds: string[] = [];
  for (const beach of beaches) {
    const hasNearRoute = routes.some((r) => {
      const path = parseRouteGeometry(r.geometry);
      const d = minDistanceKmToPath(
        { lat: Number(beach.lat), lon: Number(beach.lon) },
        path,
      );
      return d <= NEAR_ROUTE_KM;
    });
    if (hasNearRoute) {
      const card = discover.placeCards.find(
        (c) => c.id === beach.id || normalizeName(c.name) === normalizeName(beach.name),
      );
      if (card) routeLinkedBeachIds.push(card.id);
    }
  }

  const placeCards = discover.placeCards.map((card) => {
    const inRegion =
      regions.length === 0 ||
      regions.some((r) =>
        pointInTouristRegion({ lat: card.lat, lon: card.lon }, r, 4),
      );
    const linkedRoute = routeLinkedBeachIds.includes(card.id);
    return {
      ...card,
      recommended:
        card.recommended ||
        linkedRoute ||
        (beachCardIds.has(card.id) && inRegion),
      why: linkedRoute
        ? `${card.why} Trasa rowerowa przechodzi w pobliżu (~${NEAR_ROUTE_KM} km).`
        : card.why,
    };
  });

  const suggestedIds =
    routeLinkedBeachIds.length > 0
      ? [
          ...routeLinkedBeachIds,
          ...discover.suggestedIds.filter((id) => !routeLinkedBeachIds.includes(id)),
        ].slice(0, 8)
      : discover.suggestedIds;

  return { placeCards, suggestedIds };
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

export function nearestBeachLabel(
  routeId: string,
  hints: Map<string, RouteBeachProximity>,
): string | null {
  const hit = hints.get(routeId);
  if (!hit) return null;
  return `${hit.beachName} (${hit.distanceKm} km)`;
}
