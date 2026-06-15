import { countActivitiesNearPoint } from "@/lib/api/destination-osm-fill";
import { fetchWeatherPreview } from "@/lib/api/weather";
import {
  fetchWikivoyageDestination,
  type WikivoyageDestinationContent,
} from "@/lib/api/wikivoyage";
import type { ExplorationScope } from "@/lib/search/exploration-scope";
import { scopeSearchRadii } from "@/lib/search/exploration-scope";
import type { WeatherSummary } from "@/types/domain";

/** Polskie / lokalne nazwy → strona Wikivoyage (EN). */
const WIKIVOYAGE_PAGE_BY_NAME: Record<string, string> = {
  majorka: "Mallorca",
  mallorca: "Mallorca",
  madera: "Madeira",
  madeira: "Madeira",
  kreta: "Crete",
  crete: "Crete",
  ibiza: "Ibiza",
  lanzarote: "Lanzarote",
  teneryfa: "Tenerife",
  tenerife: "Tenerife",
  "gran canaria": "Gran_Canaria",
  fuerteventura: "Fuerteventura",
  korfu: "Corfu",
  corfu: "Corfu",
  rodos: "Rhodes",
  rhodes: "Rhodes",
  santorini: "Santorini",
  dubrownik: "Dubrovnik",
  dubrovnik: "Dubrovnik",
  split: "Split",
  cypr: "Cyprus",
  cyprus: "Cyprus",
  antalya: "Antalya",
  bodrum: "Bodrum",
  lizbona: "Lisbon",
  lisbon: "Lisbon",
  porto: "Porto",
  barcelona: "Barcelona",
  walencja: "Valencia",
  valencia: "Valencia",
  alikante: "Alicante",
  alicante: "Alicante",
  rzym: "Rome",
  rome: "Rome",
  sycylia: "Sicily",
  sicily: "Sicily",
  sardynia: "Sardinia",
  sardinia: "Sardinia",
  wenecja: "Venice",
  venice: "Venice",
  paryż: "Paris",
  paris: "Paris",
  nicea: "Nice",
  nice: "Nice",
  korsyka: "Corsica",
  corsica: "Corsica",
  islandia: "Iceland",
  iceland: "Iceland",
  saranda: "Sarandë",
  zakopane: "Zakopane",
  gdańsk: "Gdańsk",
  gdansk: "Gdańsk",
  kraków: "Kraków",
  krakow: "Kraków",
};

export function resolveWikivoyagePageName(destinationLabel: string): string {
  const primary = destinationLabel.split(",")[0]?.trim() ?? destinationLabel;
  const key = primary
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (WIKIVOYAGE_PAGE_BY_NAME[key]) {
    return WIKIVOYAGE_PAGE_BY_NAME[key];
  }
  return primary.replace(/\s+/g, "_");
}

function scopeIntroPl(scope: ExplorationScope, place: string): string {
  switch (scope) {
    case "local":
      return `Planujesz pobyt w jednym rejonie ${place} — poniżej skrót całej destynacji, ale szukanie regionów i noclegów skupimy na okolicy ~15 km.`;
    case "region":
      return `Zwiedzasz wybrany region ${place} — kilka miejscowości w zasięgu jednego bazy wypadowej.`;
    case "island":
      return `Chcesz poznać całą ${place} — pokażemy kilka regionów na wyspie do wyboru.`;
    case "roadtrip":
      return `Planujesz podróż po ${place} z możliwością zmiany bazy — szerszy zasięg i elastyczny dojazd.`;
  }
}

export type DestinationOverview = {
  destination_label: string;
  exploration_scope: ExplorationScope;
  scope_intro: string;
  wikivoyage: WikivoyageDestinationContent | null;
  weather: WeatherSummary | null;
  activity_counts: Record<string, number>;
  search_radius_km: number;
};

export async function buildDestinationOverview({
  destinationLabel,
  lat,
  lon,
  dateFrom,
  dateTo,
  explorationScope,
}: {
  destinationLabel: string;
  lat: number;
  lon: number;
  dateFrom: string;
  dateTo: string;
  explorationScope: ExplorationScope;
}): Promise<DestinationOverview> {
  const { near_radius_km } = scopeSearchRadii(explorationScope);
  const pageName = resolveWikivoyagePageName(destinationLabel);
  const placeName = destinationLabel.split(",")[0]?.trim() ?? destinationLabel;

  const [wikivoyage, weather, activity_counts] = await Promise.all([
    fetchWikivoyageDestination({ pageName }).catch(() => null),
    dateFrom && dateTo
      ? fetchWeatherPreview({
          location: { lat, lon },
          dateFrom,
          dateTo,
        }).catch(() => null)
      : Promise.resolve(null),
    countActivitiesNearPoint({ lat, lon, radiusKm: near_radius_km }).catch(
      () => ({}),
    ),
  ]);

  return {
    destination_label: destinationLabel,
    exploration_scope: explorationScope,
    scope_intro: scopeIntroPl(explorationScope, placeName),
    wikivoyage,
    weather,
    activity_counts,
    search_radius_km: near_radius_km,
  };
}
