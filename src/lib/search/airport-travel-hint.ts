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
  travelMode?: string,
): string | null {
  if (travelMode && travelMode !== "flight") return null;
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

  if (travelMode === "flight") {
    const mode = pl ? "samolotem" : "by plane";
    return pl
      ? `Podróż: ${tripOrigin} → destynacja (${mode}) — zaplanuj transfer z lotniska do bazy`
      : `Travel: ${tripOrigin} → destination (${mode}) — plan your airport transfer to base`;
  }

  if (travelMode === "car") {
    const mode = pl ? "samochodem" : "by car";
    return pl
      ? `Podróż: ${tripOrigin} → destynacja (${mode}) — zaplanuj czas dojazdu do wybranej bazy`
      : `Travel: ${tripOrigin} → destination (${mode}) — plan drive time to your base`;
  }

  if (travelMode === "train") {
    const mode = pl ? "pociągiem" : "by train";
    return pl
      ? `Podróż: ${tripOrigin} → destynacja (${mode}) — zaplanuj dojazd z dworca do bazy`
      : `Travel: ${tripOrigin} → destination (${mode}) — plan station-to-base transfer`;
  }

  if (travelMode === "bus") {
    const mode = pl ? "autobusem" : "by bus";
    return pl
      ? `Podróż: ${tripOrigin} → destynacja (${mode}) — zaplanuj dojazd z przystanku do bazy`
      : `Travel: ${tripOrigin} → destination (${mode}) — plan stop-to-base transfer`;
  }

  return pl
    ? `Podróż: ${tripOrigin} → destynacja (${travelMode})`
    : `Travel: ${tripOrigin} → destination (${travelMode})`;
}
