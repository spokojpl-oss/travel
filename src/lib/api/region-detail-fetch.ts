import { fetchGooglePlaceDetails, findMatchingGooglePlace, googlePlacePhotoUrl } from "@/lib/api/google-places";
import { fetchWikipediaPageSummary } from "@/lib/api/wikipedia-summary";
import { isWeakAttractionDescription } from "@/lib/plan/attraction-detail-text";
import type { Locale } from "@/i18n/config";

export type RegionDetailResult = {
  overview: string;
  heroImageUrl: string | null;
  source: "seed" | "wikipedia" | "google" | "merged";
  wikipediaUrl?: string;
  googleMapsUrl?: string;
  rating?: number | null;
  ratingCount?: number | null;
};

function isWeakRegionOverview(text: string | null | undefined): boolean {
  const t = text?.trim();
  if (!t) return true;
  if (isWeakAttractionDescription(t)) return true;
  return t.length < 160;
}

function wikiPageTitle(name: string): string {
  return name.trim().replace(/\s+/g, "_");
}

export async function resolveRegionDetail(input: {
  name: string;
  overview: string;
  centerLat: number;
  centerLon: number;
  locale: Locale;
}): Promise<RegionDetailResult> {
  const seedOverview = input.overview.trim();
  const weak = isWeakRegionOverview(seedOverview);

  const wikiPromise = weak
    ? fetchWikipediaPageSummary(wikiPageTitle(input.name), input.locale, 4500)
    : Promise.resolve(null);

  const googlePromise = findMatchingGooglePlace({
    name: input.name,
    lat: input.centerLat,
    lon: input.centerLon,
    searchVariants: [input.name, `${input.name} beach`, `${input.name} region`],
    maxDistanceKm: 8,
  }).then((match) =>
    match ? fetchGooglePlaceDetails(match.place_id).then((d) => ({ match, details: d })) : null,
  );

  const [wiki, google] = await Promise.all([wikiPromise, googlePromise]);

  const googleSummary = google?.details?.editorial_summary?.trim() ?? null;
  const wikiExtract = wiki?.extract?.trim() ?? null;
  const wikiUrl = wiki
    ? `https://${input.locale === "pl" ? "pl" : "en"}.wikipedia.org/wiki/${encodeURIComponent(wikiPageTitle(input.name))}`
    : undefined;

  let overview = seedOverview;
  let source: RegionDetailResult["source"] = "seed";

  if (weak) {
    if (googleSummary && !isWeakAttractionDescription(googleSummary)) {
      overview = googleSummary;
      source = "google";
    } else if (wikiExtract && !isWeakAttractionDescription(wikiExtract)) {
      overview = wikiExtract;
      source = "wikipedia";
    } else if (googleSummary) {
      overview = googleSummary;
      source = "google";
    }
  } else if (
    googleSummary &&
    googleSummary.length > seedOverview.length + 60 &&
    !isWeakAttractionDescription(googleSummary)
  ) {
    overview = `${seedOverview}\n\n${googleSummary}`;
    source = "merged";
  }

  const photoFromGoogle = google?.details?.photo_names[0]
    ? googlePlacePhotoUrl(google.details.photo_names[0]!)
    : null;

  return {
    overview,
    heroImageUrl: wiki?.thumbnail ?? photoFromGoogle,
    source,
    wikipediaUrl: wikiUrl,
    googleMapsUrl: google?.details?.google_maps_url ?? google?.match?.google_maps_url ?? undefined,
    rating: google?.details?.rating ?? google?.match?.rating ?? null,
    ratingCount: google?.details?.rating_count ?? google?.match?.rating_count ?? null,
  };
}
