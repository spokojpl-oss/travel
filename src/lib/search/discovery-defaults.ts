import type { Locale } from "@/i18n/config";
import { resolveIslandBoundary } from "@/lib/destinations/island-boundary";
import type { ExplorationScope } from "@/lib/search/exploration-scope";
import type { WeatherSummary } from "@/types/domain";

const WARM_ISLAND_DEFAULTS = [
  "sandy_beaches",
  "viewpoints",
  "boat_tour",
  "snorkeling",
  "old_towns",
  "archaeology",
  "museums",
] as const;

const MAINLAND_COAST_DEFAULTS = [
  "sandy_beaches",
  "viewpoints",
  "museums",
  "old_towns",
  "bike_rental",
] as const;

const CITY_DEFAULTS = [
  "museums",
  "old_towns",
  "viewpoints",
  "bike_rental",
] as const;

const KIDS_BOOST = ["zoo", "aquarium", "theme_parks", "water_parks"] as const;

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

function isLikelyIslandDestination(label: string): boolean {
  return resolveIslandBoundary(label) != null;
}

/** Gdy baza / OSM / Google nie zdążą — sensowne domyślne propozycje zamiast pustego ekranu. */
export function inferDefaultDiscoveryActivities({
  destinationLabel,
  weather,
  passengers,
  explorationScope,
}: {
  destinationLabel: string;
  weather: WeatherSummary | null;
  passengers?: string;
  explorationScope: ExplorationScope;
}): string[] {
  const picked = new Set<string>();
  const warm = (weather?.avg_temp_max ?? 22) >= 24;
  const rainy = (weather?.rainy_days ?? 0) >= 2;
  const kids = passengers ? /dzieci|child|kid/i.test(passengers) : false;
  const island = isLikelyIslandDestination(destinationLabel);
  const label = normalizeLabel(destinationLabel);

  const base = island
    ? [...WARM_ISLAND_DEFAULTS]
    : warm
      ? [...MAINLAND_COAST_DEFAULTS]
      : [...CITY_DEFAULTS];

  for (const slug of base) picked.add(slug);

  if (warm || island) {
    for (const slug of ["kayaking", "diving", "hiking_trails"] as const) {
      picked.add(slug);
    }
  }

  if (rainy) {
    for (const slug of ["museums", "caves", "aquarium"] as const) picked.add(slug);
  }

  if (kids) {
    for (const slug of KIDS_BOOST) picked.add(slug);
  }

  if (explorationScope === "local") {
    picked.delete("hiking_trails");
  }

  if (label.includes("santorini") || label.includes("mykonos") || label.includes("crete")) {
    for (const slug of [
      "sandy_beaches",
      "viewpoints",
      "boat_tour",
      "archaeology",
      "old_towns",
      "museums",
    ] as const) {
      picked.add(slug);
    }
  }

  return [...picked].slice(0, 8);
}

export function buildDiscoveryIntroWithFallback({
  placeName,
  counts,
  weather,
  suggested,
  usedFallback,
  locale = "pl",
}: {
  placeName: string;
  counts: Record<string, number>;
  weather: WeatherSummary | null;
  suggested: string[];
  usedFallback: boolean;
  locale?: Locale;
}): string {
  const found = Object.values(counts).reduce((a, b) => a + b, 0);

  if (found === 0 && usedFallback) {
    return locale === "en"
      ? `For ${placeName} we've picked ${suggested.length} typical ideas for this kind of trip — confirm or change them, then we'll find matching areas.`
      : `Dla ${placeName} wybraliśmy ${suggested.length} typowych pomysłów na taki wyjazd — potwierdźcie lub zmieńcie, potem dopasujemy rejony.`;
  }

  if (found === 0) {
    return locale === "en"
      ? `We're still gathering places around ${placeName} — you can adjust suggestions below.`
      : `Zbieramy jeszcze miejsca w okolicy ${placeName} — propozycje możecie poprawić poniżej.`;
  }

  if (locale === "en") {
    const w = weather
      ? `For your dates we expect ${weather.avg_temp_min}–${weather.avg_temp_max}°C`
      : "For your trip";
    return `${w} we found ${found} places near ${placeName} and pre-selected ${suggested.length} ideas for you — tweak them if you like, then we'll match regions.`;
  }

  const w = weather
    ? `Na Wasze daty (${weather.avg_temp_min}–${weather.avg_temp_max}°C`
    : "Na ten termin";
  const rain =
    weather && weather.rainy_days > 0
      ? `, ${weather.rainy_days} dni z opadami`
      : "";
  return `${w}${rain}) znaleźliśmy ${found} miejsc w okolicy ${placeName}. Zaznaczyliśmy ${suggested.length} propozycji — możecie je zmienić, potem dopasujemy rejony i noclegi.`;
}
