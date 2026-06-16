import { fetchWikipediaSummary } from "@/lib/api/wikipedia-summary";
import { fetchWeatherPreview } from "@/lib/api/weather";
import type { Locale } from "@/i18n/config";
import {
  buildInstantOverview,
  type DestinationOverview,
} from "@/lib/search/destination-overview-instant";
import type { ExplorationScope } from "@/lib/search/exploration-scope";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export type { DestinationOverview } from "@/lib/search/destination-overview-instant";
export {
  buildInstantOverview,
  parseDestinationLabel,
  resolveHeroImageUrl,
} from "@/lib/search/destination-overview-instant";

export async function buildDestinationOverview({
  destinationLabel,
  lat,
  lon,
  dateFrom,
  dateTo,
  explorationScope,
  locale = "pl",
}: {
  destinationLabel: string;
  lat: number;
  lon: number;
  dateFrom: string;
  dateTo: string;
  explorationScope: ExplorationScope;
  locale?: Locale;
}): Promise<DestinationOverview> {
  const base = buildInstantOverview({
    destinationLabel,
    explorationScope,
    locale,
  });

  const wikiPromise = withTimeout(
    fetchWikipediaSummary(destinationLabel, locale),
    2500,
  ).catch(() => null);

  const weatherPromise =
    dateFrom && dateTo
      ? withTimeout(
          fetchWeatherPreview({
            location: { lat, lon },
            dateFrom,
            dateTo,
          }),
          5000,
        ).catch(() => null)
      : Promise.resolve(null);

  const [wiki, weather] = await Promise.all([wikiPromise, weatherPromise]);

  return {
    ...base,
    summary: wiki?.extract ?? base.summary,
    hero_image_url: base.hero_image_url,
    weather,
    enriching: false,
  };
}
