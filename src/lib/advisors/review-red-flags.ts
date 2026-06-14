import { fetchWithCache } from "@/lib/cache/api-cache";
import { callClaudeJson } from "@/lib/api/claude";
import { apiEnv } from "@/config/api-env";
import { searchPlacesByText } from "@/lib/api/google-places";
import type { Advisor, Advisory, AdvisorContext } from "./types";

type GooglePlaceReview = {
  name: string;
  rating: number;
  text?: { text: string };
  publishTime: string;
  authorAttribution?: { displayName: string };
};

type PlaceDetailsResponse = {
  reviews?: GooglePlaceReview[];
  rating?: number;
  userRatingCount?: number;
};

export const reviewRedFlagAdvisor: Advisor = {
  category: "review_red_flag",
  async analyze(context: AdvisorContext): Promise<Advisory[]> {
    if (!context.selectedHotel) return [];
    if (context.selectedAttractions.length === 0) return [];
    if (!apiEnv.GOOGLE_PLACES_API_KEY || !apiEnv.ANTHROPIC_API_KEY) {
      return [];
    }

    const { data: cachedSearch } = await fetchWithCache<{ place_id?: string }>({
      source: "google-places-id-lookup",
      cacheParams: {
        hotel_name: context.selectedHotel.name,
        lat: context.selectedHotel.lat,
        lon: context.selectedHotel.lon,
      },
      ttlSeconds: 30 * 24 * 60 * 60,
      fetcher: async () => {
        try {
          const results = await searchPlacesByText({
            textQuery: context.selectedHotel!.name,
            bbox: {
              north: context.selectedHotel!.lat + 0.05,
              south: context.selectedHotel!.lat - 0.05,
              east: context.selectedHotel!.lon + 0.05,
              west: context.selectedHotel!.lon - 0.05,
            },
          });
          return { place_id: results[0]?.place_id };
        } catch {
          return {};
        }
      },
    });

    if (!cachedSearch.place_id) return [];

    const reviews = await fetchHotelReviews(cachedSearch.place_id).catch(
      () => [],
    );
    if (reviews.length < 5) return [];

    const profile = buildProfileSummary(context);
    const reviewsText = reviews
      .map(
        (r, i) =>
          `[${i + 1}] (${r.rating}/5, ${r.publishTime?.substring(0, 10)}) ${r.text?.text ?? "(brak treści)"}`,
      )
      .join("\n");

    const { data, usage } = await callClaudeJson<{
      red_flags: Array<{
        pattern: string;
        mentioned_in_reviews: number;
        severity: "low" | "medium" | "high";
      }>;
      green_flags: Array<{ pattern: string; mentioned_in_reviews: number }>;
      verdict: { suitable_for_profile: boolean; main_concern?: string };
    }>({
      systemPrompt: `Analizujesz recenzje hotelu pod kątem SPECYFICZNEGO profilu rodziny.
Szukasz wzorców (rzeczy wspomnianych w wielu recenzjach) które są istotne dla TEGO profilu.

ZASADY:
- Tylko wzorce wspomniane w 2+ recenzjach (nie pojedyncze opinie)
- Skupiaj się na rzeczach trafiających w profil (np. dla rodzin z dziećmi: hałas, animacje, basen, jedzenie)
- "severity: high" tylko gdy fakt ewidentnie psuje wyjazd dla profilu
- NIE wymyślaj. Jeśli nic istotnego nie znajdziesz, zwróć puste tablice.
- Odpowiedz w czystym JSON.`,
      userPrompt: `# PROFIL PODRÓŻNIKÓW
${profile}

# RECENZJE HOTELU "${context.selectedHotel.name}"
(${reviews.length} recenzji)

${reviewsText}

# ZADANIE
Znajdź red flags (problemy które trafiają w profil) i green flags (pozytywy które trafiają).
Format JSON: { "red_flags": [...], "green_flags": [...], "verdict": {...} }`,
      schema: `{"red_flags":[{"pattern":"...","mentioned_in_reviews":N,"severity":"low|medium|high"}],"green_flags":[...],"verdict":{"suitable_for_profile":bool,"main_concern":"..."}}`,
      maxTokens: 1500,
      temperature: 0.2,
    });

    const advisories: Advisory[] = [];

    const highFlags = data.red_flags.filter((f) => f.severity === "high");
    if (highFlags.length > 0) {
      advisories.push({
        category: "review_red_flag",
        severity: "warning",
        title: `Hotel "${context.selectedHotel.name}" - sygnały ostrzegawcze w recenzjach`,
        reasoning: highFlags
          .map(
            (f) =>
              `${f.pattern} (wspomniane w ${f.mentioned_in_reviews} recenzjach)`,
          )
          .join(". "),
        suggested_action: data.verdict.main_concern
          ? `${data.verdict.main_concern} - rozważ inny hotel z lepszym dopasowaniem do profilu.`
          : "Przeczytaj wybrane recenzje, zwłaszcza od podobnych podróżników.",
        source_facts: {
          hotel_id: context.selectedHotel.id,
          hotel_name: context.selectedHotel.name,
          reviews_analyzed: reviews.length,
          red_flags: data.red_flags,
          green_flags: data.green_flags,
          verdict: data.verdict,
          tokens_used: usage,
        },
      });
    } else if (data.red_flags.length > 0) {
      advisories.push({
        category: "review_red_flag",
        severity: "info",
        title: `Mniejsze uwagi z recenzji "${context.selectedHotel.name}"`,
        reasoning: data.red_flags
          .map((f) => `${f.pattern} (${f.mentioned_in_reviews} recenzji)`)
          .join(". "),
        source_facts: {
          hotel_id: context.selectedHotel.id,
          reviews_analyzed: reviews.length,
          red_flags: data.red_flags,
          green_flags: data.green_flags,
        },
      });
    }

    return advisories;
  },
};

async function fetchHotelReviews(
  placeId: string,
): Promise<GooglePlaceReview[]> {
  const resourceName = placeId.startsWith("places/")
    ? placeId
    : `places/${placeId}`;

  const { data } = await fetchWithCache<PlaceDetailsResponse>({
    source: "google-places-reviews",
    cacheParams: { place_id: placeId },
    ttlSeconds: 30 * 24 * 60 * 60,
    fetcher: async () => {
      const key = apiEnv.GOOGLE_PLACES_API_KEY;
      if (!key) throw new Error("GOOGLE_PLACES_API_KEY nie skonfigurowany");

      const response = await fetch(
        `https://places.googleapis.com/v1/${resourceName}`,
        {
          method: "GET",
          headers: {
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": "reviews,rating,userRatingCount",
          },
        },
      );
      if (!response.ok) {
        throw new Error(`Place Details error: ${response.status}`);
      }
      return response.json() as Promise<PlaceDetailsResponse>;
    },
  });

  return data.reviews ?? [];
}

function buildProfileSummary(context: AdvisorContext): string {
  const lines: string[] = [
    `Grupa: ${context.group.adults} dorosłych, ${context.group.children_ages.length} dzieci`,
  ];

  if (context.group.children_ages.length > 0) {
    lines.push(`Wiek dzieci: ${context.group.children_ages.join(", ")}`);
  }

  if (context.preferences) {
    lines.push(`Styl podróżowania: ${context.preferences.travel_style}`);
    if (
      context.preferences.exclusions &&
      context.preferences.exclusions.length > 0
    ) {
      lines.push(`Wyklucza: ${context.preferences.exclusions.join(", ")}`);
    }
    if (
      context.preferences.dietary_restrictions &&
      context.preferences.dietary_restrictions.length > 0
    ) {
      lines.push(
        `Dieta: ${context.preferences.dietary_restrictions.join(", ")}`,
      );
    }
  }

  lines.push(
    `Wybrane atrakcje: ${context.selectedAttractions
      .slice(0, 5)
      .map((a) => `${a.name} (${a.category})`)
      .join(", ")}`,
  );

  return lines.join("\n");
}
