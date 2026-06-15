import { ensureDestinationActivities } from "@/lib/api/destination-activity-prefill";
import { countActivitiesNearPoint } from "@/lib/api/destination-osm-fill";
import type { Locale } from "@/i18n/config";
import { resolveIslandBoundary } from "@/lib/destinations/island-boundary";
import { buildDestinationOverview } from "@/lib/search/destination-overview";
import type { DestinationOverview } from "@/lib/search/destination-overview-instant";
import type { ExplorationScope } from "@/lib/search/exploration-scope";
import type { WeatherSummary } from "@/types/domain";

export type DestinationDiscovery = DestinationOverview & {
  activity_counts: Record<string, number>;
  suggested_activities: string[];
  discovery_intro: string;
};

function hasChildren(passengers: string | undefined): boolean {
  if (!passengers) return false;
  return /dzieci|child|kid/i.test(passengers);
}

export function suggestActivities({
  counts,
  weather,
  passengers,
}: {
  counts: Record<string, number>;
  weather: WeatherSummary | null;
  passengers?: string;
}): string[] {
  const available = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  if (available.length === 0) return [];

  const picked = new Set<string>();

  for (const [slug] of available.slice(0, 4)) {
    picked.add(slug);
  }

  const warm = (weather?.avg_temp_max ?? 20) >= 24;
  const rainy = (weather?.rainy_days ?? 0) >= 2;
  const kids = hasChildren(passengers);

  const boost = (slugs: string[]) => {
    for (const slug of slugs) {
      if ((counts[slug] ?? 0) > 0) picked.add(slug);
    }
  };

  if (warm) {
    boost(["sandy_beaches", "snorkeling", "boat_tour", "kayaking"]);
  }
  if (rainy) {
    boost(["museums", "aquarium", "caves", "theme_parks"]);
  }
  if (kids) {
    boost(["zoo", "aquarium", "theme_parks", "water_parks"]);
  }

  return [...picked].slice(0, 8);
}

export function buildDiscoveryIntro({
  placeName,
  counts,
  weather,
  suggested,
  locale = "pl",
}: {
  placeName: string;
  counts: Record<string, number>;
  weather: WeatherSummary | null;
  suggested: string[];
  locale?: Locale;
}): string {
  const found = Object.values(counts).reduce((a, b) => a + b, 0);
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

export async function discoverDestination({
  destinationLabel,
  lat,
  lon,
  dateFrom,
  dateTo,
  explorationScope,
  locale = "pl",
  passengers,
}: {
  destinationLabel: string;
  lat: number;
  lon: number;
  dateFrom: string;
  dateTo: string;
  explorationScope: ExplorationScope;
  locale?: Locale;
  passengers?: string;
}): Promise<DestinationDiscovery> {
  const { scopeSearchRadii } = await import("@/lib/search/exploration-scope");
  const { near_radius_km } = scopeSearchRadii(explorationScope);
  const island = resolveIslandBoundary(destinationLabel);
  const searchRadius = island
    ? Math.min(near_radius_km, island.maxRadiusKm)
    : near_radius_km;

  const prefill = ensureDestinationActivities({
    lat,
    lon,
    radiusKm: searchRadius,
    destinationLabel,
  }).catch(() => ({ osmPersisted: 0, googlePersisted: 0 }));

  const PREFILL_BUDGET_MS = 12_000;

  const [overview, activity_counts] = await Promise.all([
    buildDestinationOverview({
      destinationLabel,
      lat,
      lon,
      dateFrom,
      dateTo,
      explorationScope,
      locale,
    }),
    Promise.race([
      prefill.then(() =>
        countActivitiesNearPoint({
          lat,
          lon,
          radiusKm: searchRadius,
          destinationLabel,
        }),
      ),
      new Promise<Record<string, number>>((resolve) =>
        setTimeout(async () => {
          resolve(
            await countActivitiesNearPoint({
              lat,
              lon,
              radiusKm: searchRadius,
              destinationLabel,
            }),
          );
        }, PREFILL_BUDGET_MS),
      ),
    ]),
  ]);

  void prefill.catch(() => {});

  const suggested_activities = suggestActivities({
    counts: activity_counts,
    weather: overview.weather,
    passengers,
  });

  const discovery_intro = buildDiscoveryIntro({
    placeName: overview.place_name,
    counts: activity_counts,
    weather: overview.weather,
    suggested: suggested_activities,
    locale,
  });

  return {
    ...overview,
    activity_counts,
    suggested_activities,
    discovery_intro,
    enriching: false,
  };
}
