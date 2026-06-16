import type { ExplorationScope } from "@/lib/search/exploration-scope";
import { scopeSearchRadii } from "@/lib/search/exploration-scope";

/** Promień atrakcji „w okolicy bazy” (jeden dzień bez dalekiego dojazdu). */
export function nearbyStayRadiusKm(scope: ExplorationScope): number {
  return scopeSearchRadii(scope).max_radius_km;
}

/** Maks. promień wycieczek dojazdowych — skaluje się z długością pobytu. */
export function dayTripRadiusKm(
  scope: ExplorationScope,
  tripDays: number,
): number {
  const { near_radius_km } = scopeSearchRadii(scope);
  const dayBonus = Math.min(Math.max(tripDays - 3, 0) * 14, 140);
  const cap =
    scope === "roadtrip" ? 280 : scope === "island" ? 130 : 160;
  return Math.min(Math.max(near_radius_km, 60) + dayBonus, cap);
}

/** Szacunek czasu jazdy (min) z odległości km — średnie tempo turystyczne. */
export function driveMinutesFromKm(km: number): number {
  const avgKmh = 45;
  return Math.round((km / avgKmh) * 60 * 1.15);
}
