import {
  fetchGooglePlaceDetails,
  findMatchingGooglePlace,
  resolveGooglePhotoMediaUrls,
  type GooglePlaceReview,
} from "@/lib/api/google-places";
import { fetchWikipediaPageSummary, searchWikipediaPageSummary } from "@/lib/api/wikipedia-summary";
import {
  attractionNameSearchVariants,
  buildInlineAttractionDetail,
  isLikelyEnglish,
  isWeakAttractionDescription,
  wikipediaSearchTitle,
  wikipediaTargetFromOsmTags,
} from "@/lib/plan/attraction-detail-text";
import { toPolishAttractionName } from "@/lib/plan/attraction-display-name";
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
): Promise<{
  overview: string;
  wikipediaUrl?: string;
  thumbnail?: string | null;
  wikiLocale: Locale;
} | null> {
  const wikiFromTag = wikipediaTargetFromOsmTags(tags, locale);
  const candidates: Array<{ page: string; wikiLocale: Locale }> = [];

  if (wikiFromTag) candidates.push(wikiFromTag);

  for (const variant of attractionNameSearchVariants(attraction.name, locale)) {
    candidates.push({ page: wikipediaSearchTitle(variant), wikiLocale: locale });
    if (locale === "pl") {
      candidates.push({
        page: wikipediaSearchTitle(toPolishAttractionName(variant, "pl")),
        wikiLocale: "pl",
      });
    }
  }

  const seen = new Set<string>();
  let enFallback: {
    overview: string;
    wikipediaUrl?: string;
    thumbnail?: string | null;
    wikiLocale: Locale;
  } | null = null;

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
      const hit = {
        overview: wiki.extract,
        wikipediaUrl: `https://${candidate.wikiLocale === "pl" ? "pl" : "en"}.wikipedia.org/wiki/${encodeURIComponent(candidate.page)}`,
        thumbnail: wiki.thumbnail,
        wikiLocale: candidate.wikiLocale,
      };
      if (candidate.wikiLocale === locale) return hit;
      if (candidate.wikiLocale === "en" && !enFallback) enFallback = hit;
    }
  }

  if (locale === "pl") {
    for (const variant of attractionNameSearchVariants(attraction.name, locale).slice(0, 4)) {
      const wiki = await searchWikipediaPageSummary(variant, "pl", 4000);
      if (wiki?.extract && !isWeakAttractionDescription(wiki.extract)) {
        return {
          overview: wiki.extract,
          wikipediaUrl: `https://pl.wikipedia.org/wiki/${encodeURIComponent(wiki.pageTitle ?? variant)}`,
          thumbnail: wiki.thumbnail,
          wikiLocale: "pl",
        };
      }
    }
  }

  return locale === "en" ? enFallback : null;
}

async function fetchWikipediaThumbnailOnly(
  attraction: AttractionWithActivities,
  tags: Record<string, string>,
): Promise<string | null> {
  const wikiFromTag = wikipediaTargetFromOsmTags(tags, "en");
  const candidates: string[] = [];
  if (wikiFromTag) candidates.push(wikiFromTag.page);
  for (const variant of attractionNameSearchVariants(attraction.name, "en").slice(0, 4)) {
    candidates.push(wikipediaSearchTitle(variant));
  }

  const seen = new Set<string>();
  for (const page of candidates) {
    const key = page.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const wiki = await fetchWikipediaPageSummary(page, "en", 3000);
    if (wiki?.thumbnail) return wiki.thumbnail;
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
    Boolean(inline.overview) &&
    !isWeakAttractionDescription(inline.overview) &&
    !(locale === "pl" && isLikelyEnglish(inline.overview!));

  const variants = attractionNameSearchVariants(attraction.name, locale);
  const googleLanguage = locale === "en" ? "en" : "pl";
  const matchPromise = findMatchingGooglePlace({
    name: attraction.name,
    lat,
    lon,
    searchVariants: variants,
    languageCode: googleLanguage,
  });

  const [match, wiki] = await Promise.all([
    matchPromise,
    hasStrongInline ? Promise.resolve(null) : fetchWikipediaOverview(attraction, tags, locale),
  ]);

  const details = match
    ? await fetchGooglePlaceDetails(match.place_id, googleLanguage)
    : null;

  let photoUrls: string[] = [];
  if (details?.photo_names?.length) {
    photoUrls = await resolveGooglePhotoMediaUrls(details.photo_names);
  }
  if (photoUrls.length === 0 && wiki?.thumbnail) {
    photoUrls = [wiki.thumbnail];
  }
  if (photoUrls.length === 0) {
    const thumb = await fetchWikipediaThumbnailOnly(attraction, tags);
    if (thumb) photoUrls = [thumb];
  }

  const googleEnrichment: AttractionGoogleEnrichment | undefined = match
    ? {
        placeId: details?.place_id ?? match.place_id,
        rating: details?.rating ?? match.rating,
        ratingCount: details?.rating_count ?? match.rating_count,
        googleMapsUrl: details?.google_maps_url ?? match.google_maps_url,
        website: details?.website ?? match.website,
        photoUrls,
        reviews: details?.reviews ?? [],
      }
    : photoUrls.length > 0
      ? {
          placeId: "",
          rating: null,
          ratingCount: null,
          googleMapsUrl: null,
          website: null,
          photoUrls,
          reviews: [],
        }
      : undefined;

  const googleText = googleOverviewText(details);
  const plWiki =
    locale === "pl" && wiki?.wikiLocale === "pl" ? wiki : null;

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

  const googleIsUsable =
    googleText &&
    !isWeakAttractionDescription(googleText) &&
    !(locale === "pl" && isLikelyEnglish(googleText));

  if (plWiki) {
    overview = plWiki.overview;
    source = "wikipedia";
    wikipediaUrl = plWiki.wikipediaUrl;
  } else if (googleIsUsable) {
    overview = googleText;
    source = "google";
  } else if (locale === "en" && wiki) {
    overview = wiki.overview;
    source = "wikipedia";
    wikipediaUrl = wiki.wikipediaUrl;
  } else if (inline.overview && !(locale === "pl" && isLikelyEnglish(inline.overview))) {
    overview = inline.overview;
    source = inlineSource(attraction, inline.overview);
  } else if (googleText && !(locale === "pl" && isLikelyEnglish(googleText))) {
    overview = googleText;
    source = "google";
  }

  if (
    googleText &&
    plWiki &&
    source === "wikipedia" &&
    googleText.length > plWiki.overview.length + 80 &&
    !isLikelyEnglish(googleText)
  ) {
    overview = googleText;
    source = "google";
  }

  return {
    overview,
    highlights: inline.highlights,
    source,
    wikipediaUrl,
    google: googleEnrichment,
  };
}
