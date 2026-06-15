import { fetchWithCache } from "@/lib/cache/api-cache";

const WIKI_REST = "https://en.wikipedia.org/api/rest_v1/page/summary";

/** Krótki opis z Wikipedii — jeden akapit, nie cały przewodnik. */
const WIKI_PAGE_BY_KEY: Record<string, string> = {
  majorka: "Mallorca",
  mallorca: "Mallorca",
  madera: "Madeira",
  madeira: "Madeira",
  kreta: "Crete",
  crete: "Crete",
  ibiza: "Ibiza",
  teneryfa: "Tenerife",
  tenerife: "Tenerife",
  lanzarote: "Lanzarote",
  fuerteventura: "Fuerteventura",
  "gran canaria": "Gran_Canaria",
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
  praga: "Prague",
  prague: "Prague",
  praha: "Prague",
  czechy: "Czech_Republic",
  czechia: "Czech_Republic",
  "czech republic": "Czech_Republic",
  budapeszt: "Budapest",
  budapest: "Budapest",
  wiedeń: "Vienna",
  vienna: "Vienna",
  wien: "Vienna",
  zakopane: "Zakopane",
  gdańsk: "Gdańsk",
  gdansk: "Gdańsk",
  kraków: "Kraków",
  krakow: "Kraków",
  hiszpania: "Spain",
  spain: "Spain",
  portugalia: "Portugal",
  portugal: "Portugal",
  grecja: "Greece",
  greece: "Greece",
  włochy: "Italy",
  italy: "Italy",
  francja: "France",
  france: "France",
  chorwacja: "Croatia",
  croatia: "Croatia",
  turcja: "Turkey",
  turkey: "Turkey",
  polska: "Poland",
  poland: "Poland",
};

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function resolveWikipediaPageName(destinationLabel: string): string {
  const primary =
    destinationLabel.split(",")[0]?.trim() ?? destinationLabel.trim();
  const key = normalizeKey(primary);
  if (WIKI_PAGE_BY_KEY[key]) return WIKI_PAGE_BY_KEY[key];
  return primary.replace(/\s+/g, "_");
}

export type WikipediaSummary = {
  extract: string;
  thumbnail: string | null;
};

async function fetchWikipediaSummaryLive(
  pageName: string,
  timeoutMs: number,
): Promise<WikipediaSummary | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${WIKI_REST}/${encodeURIComponent(pageName)}`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "TravelAggregator/1.0 (personal use)" },
        next: { revalidate: 0 },
      },
    );
    if (!response.ok) return null;

    const json = (await response.json()) as {
      extract?: string;
      thumbnail?: { source?: string };
    };

    const extract = json.extract?.trim();
    if (!extract) return null;

    return {
      extract: extract.length > 480 ? `${extract.slice(0, 477).trim()}…` : extract,
      thumbnail: json.thumbnail?.source ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWikipediaSummary(
  destinationLabel: string,
  timeoutMs = 3500,
): Promise<WikipediaSummary | null> {
  const pageName = resolveWikipediaPageName(destinationLabel);

  const { data } = await fetchWithCache<WikipediaSummary | null>({
    source: "wikipedia-summary",
    cacheParams: { pageName },
    ttlSeconds: 60 * 24 * 60 * 60,
    fetcher: () => fetchWikipediaSummaryLive(pageName, timeoutMs),
  });

  return data;
}
