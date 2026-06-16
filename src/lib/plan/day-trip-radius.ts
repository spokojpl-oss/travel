import type { ExplorationScope } from "@/lib/search/exploration-scope";
import { scopeSearchRadii } from "@/lib/search/exploration-scope";

/** Promień atrakcji „w okolicy bazy” (jeden dzień bez dalekiego dojazdu). */
export function stayRadiusKm(scope: ExplorationScope): number {
  return scopeSearchRadii(scope).stay_radius_km;
}

/** @deprecated Użyj stayRadiusKm */
export function nearbyStayRadiusKm(scope: ExplorationScope): number {
  return stayRadiusKm(scope);
}

/** Maks. promień wycieczek dojazdowych — skaluje się z długością pobytu i scope. */
export function exploreRadiusKm(
  scope: ExplorationScope,
  tripDays: number,
): number {
  const { stay_radius_km, explore_radius_km } = scopeSearchRadii(scope);

  if (scope === "local") {
    return stay_radius_km;
  }

  const dayBonus = Math.min(Math.max(tripDays - 3, 0) * 14, 140);
  const cap =
    scope === "roadtrip" ? 280 : scope === "island" ? 130 : 160;
  const base = scope === "roadtrip" ? explore_radius_km : Math.max(explore_radius_km, 60);

  return Math.min(base + dayBonus, cap);
}

/** @deprecated Użyj exploreRadiusKm */
export function dayTripRadiusKm(
  scope: ExplorationScope,
  tripDays: number,
): number {
  return exploreRadiusKm(scope, tripDays);
}

/** Szacunek czasu jazdy (min) z odległości km — średnie tempo turystyczne. */
export function driveMinutesFromKm(km: number): number {
  const avgKmh = 45;
  return Math.round((km / avgKmh) * 60 * 1.15);
}

/** Czy scope pozwala na wycieczki dojazdowe. */
export function allowsDayTrips(scope: ExplorationScope): boolean {
  return scope !== "local";
}

/** Promienie wyszukiwania planu — respektują suwak użytkownika (stay) z wyszukiwania. */
export function resolvePlanSearchRadii({
  scope,
  tripDays,
  stayRadiusKm: stayOverride,
  exploreRadiusKm: exploreOverride,
}: {
  scope: ExplorationScope;
  tripDays: number;
  stayRadiusKm?: number | null;
  exploreRadiusKm?: number | null;
}): { stay_radius_km: number; explore_radius_km: number } {
  const stay = stayOverride ?? stayRadiusKm(scope);
  let explore = exploreOverride ?? exploreRadiusKm(scope, tripDays);

  if (stayOverride != null) {
    if (scope === "local" || stay <= 20) {
      explore = stay;
    } else {
      explore = Math.min(explore, stay + Math.max(15, Math.round(stay * 0.6)));
    }
  }

  return { stay_radius_km: stay, explore_radius_km: explore };
}
