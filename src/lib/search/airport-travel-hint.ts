import { distanceKm } from "@/lib/search/geo-clustering";

export type AirportPin = {
  iata_code: string;
  name: string;
  lat: number;
  lon: number;
};

/** Szacunek jazdy ~55 km/h — spójny z lodging-sub-areas. */
export function estimateDriveMinutes(km: number): number {
  return Math.max(5, Math.round((km / 55) * 60));
}

export function formatAirportTravelHint(
  airports: AirportPin[],
  center: { lat: number; lon: number } | null | undefined,
  pl: boolean,
): string | null {
  if (airports.length === 0 || center == null) return null;
  const airport = airports[0]!;
  const km = distanceKm(center, { lat: airport.lat, lon: airport.lon });
  const min = estimateDriveMinutes(km);
  return pl
    ? `Lotnisko ${airport.iata_code} (${airport.name}) — ok. ${Math.round(km)} km, ~${min} min jazdy do rejonu`
    : `${airport.iata_code} (${airport.name}) — ~${Math.round(km)} km, ~${min} min drive to your area`;
}

export function formatOriginToDestinationHint(
  tripOrigin: string,
  travelMode: string,
  pl: boolean,
): string | null {
  if (!tripOrigin || tripOrigin === "—") return null;
  const mode =
    travelMode === "flight"
      ? pl
        ? "samolotem"
        : "by plane"
      : travelMode === "car"
        ? pl
          ? "samochodem"
          : "by car"
        : travelMode;
  return pl
    ? `Podróż: ${tripOrigin} → destynacja (${mode}) — pamiętaj o czasie dojazdu z lotniska do bazy`
    : `Travel: ${tripOrigin} → destination (${mode}) — factor airport transfer to your base`;
}
