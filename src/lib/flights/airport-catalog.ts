import {
  NEARBY_FOREIGN_AIRPORTS,
  POLISH_AIRPORT_IATAS,
  POLISH_AIRPORTS,
  matchesPolandOriginQuery,
} from "@/lib/flights/polish-airports";

export type AirportSuggestion = {
  iata: string;
  name: string;
  city: string | null;
  country_code: string;
};

function buildCatalog(): AirportSuggestion[] {
  const polish = Object.entries(POLISH_AIRPORTS).map(([iata, info]) => ({
    iata,
    name: info.name,
    city: info.name.split(" ")[0] ?? info.name,
    country_code: "PL",
  }));

  const nearby = Object.entries(NEARBY_FOREIGN_AIRPORTS).map(([iata, info]) => ({
    iata,
    name: info.name,
    city: info.name,
    country_code: info.country,
  }));

  return [...polish, ...nearby];
}

const CATALOG = buildCatalog();

export function searchAirportCatalog(
  query: string,
  limit = 8,
): AirportSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return CATALOG.slice(0, limit);
  }

  return CATALOG.filter(
    (a) =>
      a.iata.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.city?.toLowerCase().includes(q) ?? false),
  ).slice(0, limit);
}

export function formatAirportLabel(airport: AirportSuggestion): string {
  return `${airport.name} (${airport.iata})`;
}

export type CountryOriginOption = {
  country_code: string;
  label: string;
  airport_count: number;
};

export function searchCountryOriginOptions(query: string): CountryOriginOption[] {
  const q = query.trim();
  if (!q || matchesPolandOriginQuery(q)) {
    return [
      {
        country_code: "PL",
        label: "Polska",
        airport_count: POLISH_AIRPORT_IATAS.length,
      },
    ];
  }
  return [];
}
