import { fetchWithCache } from "@/lib/cache/api-cache";
import type { Locale } from "@/i18n/config";

const WIKI_REST: Record<Locale, string> = {
  pl: "https://pl.wikipedia.org/api/rest_v1/page/summary",
  en: "https://en.wikipedia.org/api/rest_v1/page/summary",
};

const WIKI_PAGE_PL: Record<string, string> = {
  majorka: "Majorka",
  mallorca: "Majorka",
  madera: "Madera",
  madeira: "Madera",
  kreta: "Kreta",
  crete: "Kreta",
  ibiza: "Ibiza",
  teneryfa: "Teneryfa",
  tenerife: "Teneryfa",
  lanzarote: "Lanzarote",
  fuerteventura: "Fuerteventura",
  "gran canaria": "Gran_Canaria",
  korfu: "Korfu",
  corfu: "Korfu",
  rodos: "Rodos",
  rhodes: "Rodos",
  santorini: "Santorini",
  dubrownik: "Dubrownik",
  dubrovnik: "Dubrownik",
  split: "Split",
  cypr: "Cypr",
  cyprus: "Cypr",
  antalya: "Antalya",
  bodrum: "Bodrum",
  lizbona: "Lizbona",
  lisbon: "Lizbona",
  porto: "Porto",
  barcelona: "Barcelona",
  walencja: "Walencja",
  valencia: "Walencja",
  alikante: "Alicante",
  alicante: "Alicante",
  rzym: "Rzym",
  rome: "Rzym",
  sycylia: "Sycylia",
  sicily: "Sycylia",
  sardynia: "Sardynia",
  sardinia: "Sardynia",
  wenecja: "Wenecja",
  venice: "Wenecja",
  paryż: "Paryż",
  paris: "Paryż",
  nicea: "Nicea",
  nice: "Nicea",
  korsyka: "Korsyka",
  corsica: "Korsyka",
  islandia: "Islandia",
  iceland: "Islandia",
  praga: "Praga",
  prague: "Praga",
  praha: "Praga",
  czechy: "Czechy",
  czechia: "Czechy",
  "czech republic": "Czechy",
  budapeszt: "Budapeszt",
  budapest: "Budapeszt",
  wiedeń: "Wiedeń",
  vienna: "Wiedeń",
  wien: "Wiedeń",
  zakopane: "Zakopane",
  gdańsk: "Gdańsk",
  gdansk: "Gdańsk",
  kraków: "Kraków",
  krakow: "Kraków",
  hiszpania: "Hiszpania",
  spain: "Hiszpania",
  portugalia: "Portugalia",
  portugal: "Portugalia",
  grecja: "Grecja",
  greece: "Grecja",
  włochy: "Włochy",
  italy: "Włochy",
  francja: "Francja",
  france: "Francja",
  chorwacja: "Chorwacja",
  croatia: "Chorwacja",
  turcja: "Turcja",
  turkey: "Turcja",
  polska: "Polska",
  poland: "Polska",
};

const WIKI_PAGE_EN: Record<string, string> = {
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

export function resolveWikipediaPageName(
  destinationLabel: string,
  locale: Locale = "pl",
): string {
  const primary =
    destinationLabel.split(",")[0]?.trim() ?? destinationLabel.trim();
  const key = normalizeKey(primary);
  const map = locale === "pl" ? WIKI_PAGE_PL : WIKI_PAGE_EN;
  if (map[key]) return map[key];
  return primary.replace(/\s+/g, "_");
}

export type WikipediaSummary = {
  extract: string;
  thumbnail: string | null;
};

function upscaleWikiThumbnail(url: string | undefined): string | null {
  if (!url) return null;
  return url.replace(/\/\d+px-/, "/800px-");
}

async function fetchWikipediaSummaryLive(
  pageName: string,
  locale: Locale,
  timeoutMs: number,
): Promise<WikipediaSummary | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${WIKI_REST[locale]}/${encodeURIComponent(pageName)}`,
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
      lang?: string;
    };

    const extract = json.extract?.trim();
    if (!extract) return null;

    return {
      extract: extract.length > 480 ? `${extract.slice(0, 477).trim()}…` : extract,
      thumbnail: upscaleWikiThumbnail(json.thumbnail?.source),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWikipediaSummary(
  destinationLabel: string,
  locale: Locale = "pl",
  timeoutMs = 3500,
): Promise<WikipediaSummary | null> {
  const pageName = resolveWikipediaPageName(destinationLabel, locale);

  const { data } = await fetchWithCache<WikipediaSummary | null>({
    source: locale === "pl" ? "wikipedia-summary-pl" : "wikipedia-summary-en",
    cacheParams: { pageName },
    ttlSeconds: 60 * 24 * 60 * 60,
    fetcher: () => fetchWikipediaSummaryLive(pageName, locale, timeoutMs),
  });

  return data;
}
