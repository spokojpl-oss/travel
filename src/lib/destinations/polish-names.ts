import type { DestinationSuggestion } from "@/lib/destinations/catalog";

/** Angielskie / lokalne nazwy OSM → polska forma wyświetlana użytkownikowi. */
const PLACE_NAME_PL: Record<string, string> = {
  Mallorca: "Majorka",
  Majorca: "Majorka",
  "Palma de Mallorca": "Palma de Majorka",
  Alicante: "Alikante",
  Madeira: "Madera",
  Crete: "Kreta",
  Rhodes: "Rodos",
  Corfu: "Korfu",
  Santorini: "Santorini",
  "Dubrovnik": "Dubrownik",
  Cyprus: "Cypr",
  Sicily: "Sycylia",
  Sardinia: "Sardynia",
  Venice: "Wenecja",
  Paris: "Paryż",
  Nice: "Nicea",
  Corsica: "Korsyka",
  Iceland: "Islandia",
  Rome: "Rzym",
  Lisbon: "Lizbona",
  Valencia: "Walencja",
  Barcelona: "Barcelona",
  Prague: "Praga",
  Budapest: "Budapeszt",
  Vienna: "Wiedeń",
  Warsaw: "Warszawa",
  Krakow: "Kraków",
  "Kraków": "Kraków",
  Gdansk: "Gdańsk",
  "Gdańsk": "Gdańsk",
  Zakopane: "Zakopane",
  Tenerife: "Teneryfa",
  Lanzarote: "Lanzarote",
  Fuerteventura: "Fuerteventura",
  "Gran Canaria": "Gran Canaria",
  Antalya: "Antalya",
  Bodrum: "Bodrum",
  Porto: "Porto",
  Split: "Split",
  Saranda: "Saranda",
  Bergen: "Bergen",
  Oslo: "Oslo",
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function toPolishPlaceName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return PLACE_NAME_PL[trimmed] ?? PLACE_NAME_PL[trimmed.replace(/\s+/g, " ")] ?? trimmed;
}

export function matchCatalogDestination(
  query: string,
  catalog: DestinationSuggestion[],
): DestinationSuggestion | null {
  const q = normalizeKey(query);
  if (!q) return null;

  for (const dest of catalog) {
    if (normalizeKey(dest.name) === q) return dest;
    if (normalizeKey(dest.country) === q) continue;
    if (dest.region && normalizeKey(dest.region) === q) return dest;
    for (const alias of dest.aliases ?? []) {
      if (normalizeKey(alias) === q || normalizeKey(alias).includes(q)) return dest;
    }
    if (normalizeKey(dest.name).includes(q) || q.includes(normalizeKey(dest.name))) {
      return dest;
    }
  }
  return null;
}

/** Zapytanie do Nominatim — angielska nazwa miejsca + kraj zwiększa trafność geokodera. */
export function geocodeQueryForDestination(
  query: string,
  catalogMatch: DestinationSuggestion | null,
): string {
  if (catalogMatch?.geocodeQuery) return catalogMatch.geocodeQuery;
  if (catalogMatch) return `${catalogMatch.name}, ${catalogMatch.country}`;

  const q = query.trim();
  const lower = normalizeKey(q);
  for (const [en, pl] of Object.entries(PLACE_NAME_PL)) {
    if (normalizeKey(pl) === lower || lower.includes(normalizeKey(pl))) {
      return en;
    }
    if (normalizeKey(en) === lower) return en;
  }
  return q;
}
