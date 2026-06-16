import {
  fetchGooglePlaceDetails,
  findMatchingGooglePlace,
  googlePlacePhotoUrl,
  type GooglePlaceReview,
} from "@/lib/api/google-places";
import { fetchWikipediaPageSummary } from "@/lib/api/wikipedia-summary";
import {
  attractionNameSearchVariants,
  buildInlineAttractionDetail,
  isWeakAttractionDescription,
  wikipediaSearchTitle,
  wikipediaTargetFromOsmTags,
} from "@/lib/plan/attraction-detail-text";
import type { AttractionWithActivities } from "@/types/domain";
import type { Locale } from "@/i18n/config";

export type AttractionGoogleEnrichment = {
  placeId: string;
  rating: number | null;
  ratingCount: number | null;
  googleMapsUrl: string | null;
  website: string | null;
  photoUrls: string[];
  reviews: GooglePlaceReview[];
};

export type AttractionDetailResult = {
  overview: string | null;
  highlights: string[];
  source: "curated" | "db" | "osm" | "wikipedia" | "google" | "none";
  wikipediaUrl?: string;
  google?: AttractionGoogleEnrichment;
};

function reviewOverviewSnippet(reviews: GooglePlaceReview[]): string | null {
  const best = reviews.find((r) => r.text.length >= 80 && r.rating >= 4);
  if (!best) return reviews[0]?.text?.trim() || null;
  const text = best.text.trim();
  if (text.length <= 420) return text;
  const cut = text.slice(0, 400);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 200 ? lastSpace : 400).trim()}…`;
}

function googleOverviewText(
  enrichment: Awaited<ReturnType<typeof fetchGooglePlaceDetails>>,
): string | null {
  if (!enrichment) return null;
  const editorial = enrichment.editorial_summary?.trim();
  if (editorial && !isWeakAttractionDescription(editorial)) return editorial;
  return reviewOverviewSnippet(enrichment.reviews);
}

async function fetchWikipediaOverview(
  attraction: AttractionWithActivities,
  tags: Record<string, string>,
  locale: Locale,
): Promise<{ overview: string; wikipediaUrl?: string } | null> {
  const wikiFromTag = wikipediaTargetFromOsmTags(tags, locale);
  const candidates: Array<{ page: string; wikiLocale: Locale }> = [];

  if (wikiFromTag) candidates.push(wikiFromTag);

  for (const variant of attractionNameSearchVariants(attraction.name)) {
    candidates.push({ page: wikipediaSearchTitle(variant), wikiLocale: locale });
    if (locale === "pl") {
      candidates.push({ page: wikipediaSearchTitle(variant), wikiLocale: "en" });
    }
  }

  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = `${candidate.wikiLocale}:${candidate.page}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const wiki = await fetchWikipediaPageSummary(
      candidate.page,
      candidate.wikiLocale,
      4000,
    );
    if (wiki?.extract && !isWeakAttractionDescription(wiki.extract)) {
      return {
        overview: wiki.extract,
        wikipediaUrl: `https://${candidate.wikiLocale === "pl" ? "pl" : "en"}.wikipedia.org/wiki/${encodeURIComponent(candidate.page)}`,
      };
    }
  }

  return null;
}

function inlineSource(
  attraction: AttractionWithActivities,
  inlineOverview: string,
): AttractionDetailResult["source"] {
  if (attraction.source === "curated") return "curated";
  if (inlineOverview === attraction.description?.trim()) return "db";
  return "osm";
}

export async function resolveAttractionDetail(
  attraction: AttractionWithActivities,
  locale: Locale,
): Promise<AttractionDetailResult> {
  const inline = buildInlineAttractionDetail(attraction, locale);
  const lat = Number(attraction.lat);
  const lon = Number(attraction.lon);

  const tags =
    attraction.tags && typeof attraction.tags === "object" && !Array.isArray(attraction.tags)
      ? (Object.fromEntries(
          Object.entries(attraction.tags as Record<string, unknown>).map(([k, v]) => [
            k,
            String(v ?? ""),
          ]),
        ) as Record<string, string>)
      : {};

  const hasStrongInline =
    Boolean(inline.overview) && !isWeakAttractionDescription(inline.overview);

  const variants = attractionNameSearchVariants(attraction.name);
  const matchPromise = findMatchingGooglePlace({
    name: attraction.name,
    lat,
    lon,
    searchVariants: variants,
  });

  const [match, wiki] = await Promise.all([
    matchPromise,
    hasStrongInline ? Promise.resolve(null) : fetchWikipediaOverview(attraction, tags, locale),
  ]);

  const details = match ? await fetchGooglePlaceDetails(match.place_id) : null;

  const googleEnrichment: AttractionGoogleEnrichment | undefined = match
    ? {
        placeId: details?.place_id ?? match.place_id,
        rating: details?.rating ?? match.rating,
        ratingCount: details?.rating_count ?? match.rating_count,
        googleMapsUrl: details?.google_maps_url ?? match.google_maps_url,
        website: details?.website ?? match.website,
        photoUrls: (details?.photo_names ?? []).map(googlePlacePhotoUrl),
        reviews: details?.reviews ?? [],
      }
    : undefined;

  const googleText = googleOverviewText(details);

  if (hasStrongInline) {
    return {
      overview: inline.overview,
      highlights: inline.highlights,
      source: inlineSource(attraction, inline.overview!),
      google: googleEnrichment,
    };
  }

  let overview: string | null = null;
  let source: AttractionDetailResult["source"] = "none";
  let wikipediaUrl: string | undefined;

  if (googleText && !isWeakAttractionDescription(googleText)) {
    overview = googleText;
    source = "google";
  } else if (wiki) {
    overview = wiki.overview;
    source = "wikipedia";
    wikipediaUrl = wiki.wikipediaUrl;
  } else if (googleText) {
    overview = googleText;
    source = "google";
  } else if (inline.overview) {
    overview = inline.overview;
    source = inlineSource(attraction, inline.overview);
  }

  if (
    googleText &&
    wiki &&
    source === "google" &&
    googleText.length < 140 &&
    wiki.overview.length > googleText.length + 80
  ) {
    overview = wiki.overview;
    source = "wikipedia";
    wikipediaUrl = wiki.wikipediaUrl;
  }

  return {
    overview,
    highlights: inline.highlights,
    source,
    wikipediaUrl,
    google: googleEnrichment,
  };
}
