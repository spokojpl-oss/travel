import { fillForDestinationDiscovery } from "@/lib/api/destination-discovery-fill";
import { countActivitiesNearPoint } from "@/lib/api/destination-osm-fill";
import { fetchWeatherPreview } from "@/lib/api/weather";
import type { Locale } from "@/i18n/config";
import { resolveIslandBoundary } from "@/lib/destinations/island-boundary";
import {
  buildDiscoveryIntroWithFallback,
  inferDefaultDiscoveryActivities,
} from "@/lib/search/discovery-defaults";
import {
  buildInstantOverview,
} from "@/lib/search/destination-overview";
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

/** Krótki limit — discovery musi odpowiedzieć od razu, OSM fill idzie w tle. */
const DISCOVERY_COUNT_TIMEOUT_MS = 3_000;
const DISCOVERY_WEATHER_TIMEOUT_MS = 2_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Gdy API discovery padnie — użytkownik i tak może iść dalej. */
export function buildFallbackDiscovery({
  destinationLabel,
  explorationScope,
  locale = "pl",
  passengers,
}: {
  destinationLabel: string;
  explorationScope: ExplorationScope;
  locale?: Locale;
  passengers?: string;
}): DestinationDiscovery {
  const overview = buildInstantOverview({
    destinationLabel,
    explorationScope,
    locale,
  });
  const suggested_activities = inferDefaultDiscoveryActivities({
    destinationLabel,
    weather: null,
    passengers,
    explorationScope,
  });

  return {
    ...overview,
    activity_counts: {},
    suggested_activities,
    discovery_intro: buildDiscoveryIntroWithFallback({
      placeName: overview.place_name,
      counts: {},
      weather: null,
      suggested: suggested_activities,
      usedFallback: true,
      locale,
    }),
    enriching: false,
  };
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

  const overviewBase = buildInstantOverview({
    destinationLabel,
    explorationScope,
    locale,
  });

  void fillForDestinationDiscovery({
    lat,
    lon,
    radiusKm: searchRadius,
    destinationLabel,
  }).catch(() => {});

  const weatherPromise: Promise<WeatherSummary | null> =
    dateFrom && dateTo
      ? withTimeout(
          fetchWeatherPreview({
            location: { lat, lon },
            dateFrom,
            dateTo,
          }),
          DISCOVERY_WEATHER_TIMEOUT_MS,
        )
      : Promise.resolve(null);

  const countsPromise = Promise.race([
    countActivitiesNearPoint({
      lat,
      lon,
      radiusKm: searchRadius,
      destinationLabel,
    }).catch(() => ({})),
    sleep(DISCOVERY_COUNT_TIMEOUT_MS).then(() => ({}) as Record<string, number>),
  ]);

  const [activity_counts, weather] = await Promise.all([
    countsPromise,
    weatherPromise,
  ]);

  const overview: DestinationOverview = {
    ...overviewBase,
    weather,
    enriching: false,
  };

  let suggested_activities = suggestActivities({
    counts: activity_counts,
    weather: overview.weather,
    passengers,
  });

  let usedFallback = false;
  if (suggested_activities.length === 0) {
    usedFallback = true;
    suggested_activities = inferDefaultDiscoveryActivities({
      destinationLabel,
      weather: overview.weather,
      passengers,
      explorationScope,
    });
  }

  const discovery_intro = buildDiscoveryIntroWithFallback({
    placeName: overview.place_name,
    counts: activity_counts,
    weather: overview.weather,
    suggested: suggested_activities,
    usedFallback,
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
