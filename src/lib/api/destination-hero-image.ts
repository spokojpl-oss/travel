import { fetchWithCache } from "@/lib/cache/api-cache";
import { resolveWikipediaPageName } from "@/lib/api/wikipedia-summary";
import { resolveHeroImageUrl } from "@/lib/search/destination-overview-instant";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

export async function fetchDestinationHeroImage(
  destinationLabel: string,
): Promise<string | null> {
  const known = resolveHeroImageUrl(destinationLabel);
  if (known) return known;

  const pageName = resolveWikipediaPageName(destinationLabel);

  const { data } = await fetchWithCache<string | null>({
    source: "wikipedia-hero",
    cacheParams: { pageName },
    ttlSeconds: 90 * 24 * 60 * 60,
    fetcher: async () => {
      const params = new URLSearchParams({
        action: "query",
        titles: pageName,
        prop: "pageimages",
        format: "json",
        pithumbsize: "1280",
        piprop: "thumbnail",
      });

      const response = await fetch(`${WIKIPEDIA_API}?${params}`, {
        headers: { "User-Agent": "TravelAggregator/1.0 (personal use)" },
      });

      if (!response.ok) return null;

      const json = (await response.json()) as {
        query?: {
          pages?: Record<string, { thumbnail?: { source?: string } }>;
        };
      };

      const pages = json.query?.pages;
      if (!pages) return null;

      const page = Object.values(pages)[0];
      return page?.thumbnail?.source ?? null;
    },
  });

  return data;
}
