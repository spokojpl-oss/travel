import { fetchWithCache } from "@/lib/cache/api-cache";
import { resolveWikivoyagePageName } from "@/lib/search/destination-overview";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

/** Znane destynacje — natychmiastowy podgląd bez API. */
const KNOWN_HERO_IMAGES: Record<string, string> = {
  mallorca:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Palma_de_Mallorca_Sunset_Harbour_Spain.jpg/1280px-Palma_de_Mallorca_Sunset_Harbour_Spain.jpg",
  majorka:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Palma_de_Mallorca_Sunset_Harbour_Spain.jpg/1280px-Palma_de_Mallorca_Sunset_Harbour_Spain.jpg",
  crete:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Balos_lagoon_Crete_Greece.jpg/1280px-Balos_lagoon_Crete_Greece.jpg",
  kreta:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Balos_lagoon_Crete_Greece.jpg/1280px-Balos_lagoon_Crete_Greece.jpg",
  ibiza:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Eivissa_-_Ibiza_-_Cala_Comte_-_Sunset_-_02.jpg/1280px-Eivissa_-_Ibiza_-_Cala_Comte_-_Sunset_-_02.jpg",
  tenerife:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Teide_National_Park_2.jpg/1280px-Teide_National_Park_2.jpg",
  teneryfa:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Teide_National_Park_2.jpg/1280px-Teide_National_Park_2.jpg",
  barcelona:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Barcelona_Skyline_Panorama_-_Dec_2007.jpg/1280px-Barcelona_Skyline_Panorama_-_Dec_2007.jpg",
  lisbon:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Lisbon_aerial_view.jpg/1280px-Lisbon_aerial_view.jpg",
  lizbona:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Lisbon_aerial_view.jpg/1280px-Lisbon_aerial_view.jpg",
};

function heroKey(destinationLabel: string): string {
  const primary = destinationLabel.split(",")[0]?.trim() ?? destinationLabel;
  return primary
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function fetchDestinationHeroImage(
  destinationLabel: string,
): Promise<string | null> {
  const key = heroKey(destinationLabel);
  if (KNOWN_HERO_IMAGES[key]) {
    return KNOWN_HERO_IMAGES[key];
  }

  const pageName = resolveWikivoyagePageName(destinationLabel);

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
          pages?: Record<
            string,
            { thumbnail?: { source?: string }; pageimage?: string }
          >;
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
