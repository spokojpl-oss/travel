export const POLISH_AIRPORTS = {
  WAW: { name: "Warszawa Chopin", priority: 1 },
  KRK: { name: "Kraków-Balice", priority: 1 },
  GDN: { name: "Gdańsk", priority: 1 },
  KTW: { name: "Katowice", priority: 1 },
  WRO: { name: "Wrocław", priority: 1 },
  POZ: { name: "Poznań", priority: 1 },
  MOD: { name: "Modlin", priority: 1 },
  RZE: { name: "Rzeszów", priority: 2 },
  SZZ: { name: "Szczecin", priority: 2 },
  BZG: { name: "Bydgoszcz", priority: 2 },
  LCJ: { name: "Łódź", priority: 2 },
  LUZ: { name: "Lublin", priority: 2 },
  OZE: { name: "Olsztyn-Mazury", priority: 3 },
  IEG: { name: "Zielona Góra", priority: 3 },
  SZY: { name: "Olsztyn", priority: 3 },
} as const;

export type PolishAirportIata = keyof typeof POLISH_AIRPORTS;

export const POLISH_AIRPORT_IATAS = Object.keys(
  POLISH_AIRPORTS,
) as PolishAirportIata[];

/** Lotniska przypisane do kraju — wybór „Polska” w polu wylotu. */
export const COUNTRY_FLIGHT_ORIGINS: Record<string, readonly string[]> = {
  PL: POLISH_AIRPORT_IATAS,
};

const POLAND_QUERY = /^(pl|pol|polsk\w*|poland)$/i;

export function matchesPolandOriginQuery(query: string): boolean {
  return POLAND_QUERY.test(query.trim());
}

export function resolveFlightOriginsFromTrip(trip: {
  origin_iata: string | null;
  origin_scope: string | null;
}): string[] | undefined {
  if (trip.origin_scope) {
    const airports = COUNTRY_FLIGHT_ORIGINS[trip.origin_scope.toUpperCase()];
    if (airports?.length) return [...airports];
  }
  if (trip.origin_iata) {
    return [trip.origin_iata.toUpperCase()];
  }
  return undefined;
}

export const NEARBY_FOREIGN_AIRPORTS = {
  BER: { name: "Berlin Brandenburg", country: "DE", priority: 1 },
  VIE: { name: "Wiedeń", country: "AT", priority: 2 },
  PRG: { name: "Praga", country: "CZ", priority: 2 },
  OSR: { name: "Ostrava", country: "CZ", priority: 3 },
  KSC: { name: "Koszyce", country: "SK", priority: 3 },
} as const;
