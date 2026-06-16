import { fillForDestinationDiscovery } from "@/lib/api/destination-discovery-fill";
import { countActivitiesNearPoint } from "@/lib/api/destination-osm-fill";
import type { Locale } from "@/i18n/config";
import { resolveIslandBoundary } from "@/lib/destinations/island-boundary";
import {
  buildDiscoveryIntroWithFallback,
  inferDefaultDiscoveryActivities,
} from "@/lib/search/discovery-defaults";
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

const DISCOVERY_FILL_TIMEOUT_MS = 45_000;

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

  const overviewPromise = buildDestinationOverview({
    destinationLabel,
    lat,
    lon,
    dateFrom,
    dateTo,
    explorationScope,
    locale,
  });

  const countsPromise = (async () => {
    await Promise.race([
      fillForDestinationDiscovery({
        lat,
        lon,
        radiusKm: searchRadius,
        destinationLabel,
      }),
      new Promise<void>((resolve) =>
        setTimeout(resolve, DISCOVERY_FILL_TIMEOUT_MS),
      ),
    ]);

    return countActivitiesNearPoint({
      lat,
      lon,
      radiusKm: searchRadius,
      destinationLabel,
    });
  })();

  const [overview, activity_counts] = await Promise.all([
    overviewPromise,
    countsPromise,
  ]);

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
