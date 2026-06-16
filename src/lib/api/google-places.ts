import { fetchWithCache } from "@/lib/cache/api-cache";
import { apiEnv } from "@/config/api-env";
import { distanceKm } from "@/lib/search/geo-clustering";
import type { BoundingBox, GeoPoint } from "@/types/domain";

const PLACES_API_BASE = "https://places.googleapis.com/v1";

export type GooglePlaceReview = {
  author: string;
  rating: number;
  text: string;
  publishedAt: string | null;
};

export type GooglePlaceDetails = {
  place_id: string;
  name: string;
  editorial_summary: string | null;
  rating: number | null;
  rating_count: number | null;
  google_maps_url: string | null;
  website: string | null;
  address: string | null;
  photo_names: string[];
  reviews: GooglePlaceReview[];
};

function requireGooglePlacesKey(): string {
  const key = apiEnv.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_PLACES_API_KEY nie skonfigurowany");
  }
  return key;
}

type GooglePlaceSearchTextResponse = {
  places?: Array<{
    id: string;
    displayName: { text: string; languageCode: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    types?: string[];
    websiteUri?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    googleMapsUri?: string;
    currentOpeningHours?: { weekdayDescriptions?: string[] };
    primaryType?: string;
    editorialSummary?: { text: string; languageCode: string };
  }>;
};

export type GooglePlace = {
  place_id: string;
  name: string;
  address: string | null;
  location: GeoPoint | null;
  rating: number | null;
  rating_count: number | null;
  price_level: string | null;
  types: string[];
  website: string | null;
  phone: string | null;
  google_maps_url: string | null;
  opening_hours: string[];
  editorial_summary: string | null;
};

export async function searchPlacesByText({
  textQuery,
  bbox,
  forceRefresh = false,
  languageCode = "pl",
}: {
  textQuery: string;
  bbox: BoundingBox;
  forceRefresh?: boolean;
  languageCode?: string;
}): Promise<GooglePlace[]> {
  const { data } = await fetchWithCache<GooglePlaceSearchTextResponse>({
    source: "google-places-search",
    cacheParams: { textQuery, bbox, languageCode },
    ttlSeconds: 30 * 24 * 60 * 60,
    forceRefresh,
    fetcher: async () => {
      const response = await fetch(`${PLACES_API_BASE}/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": requireGooglePlacesKey(),
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.rating",
            "places.userRatingCount",
            "places.priceLevel",
            "places.types",
            "places.websiteUri",
            "places.nationalPhoneNumber",
            "places.googleMapsUri",
            "places.currentOpeningHours",
            "places.primaryType",
            "places.editorialSummary",
          ].join(","),
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: 20,
          languageCode,
          locationBias: {
            rectangle: {
              low: { latitude: bbox.south, longitude: bbox.west },
              high: { latitude: bbox.north, longitude: bbox.east },
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Places error ${response.status}: ${errorText}`);
      }

      return response.json() as Promise<GooglePlaceSearchTextResponse>;
    },
  });

  return (data.places ?? []).map(normalizeGooglePlace);
}

export async function searchPlacesNearby({
  center,
  radiusMeters,
  includedTypes,
  forceRefresh = false,
}: {
  center: GeoPoint;
  radiusMeters: number;
  includedTypes: string[];
  forceRefresh?: boolean;
}): Promise<GooglePlace[]> {
  const { data } = await fetchWithCache<GooglePlaceSearchTextResponse>({
    source: "google-places-nearby",
    cacheParams: { center, radiusMeters, includedTypes },
    ttlSeconds: 30 * 24 * 60 * 60,
    forceRefresh,
    fetcher: async () => {
      const response = await fetch(`${PLACES_API_BASE}/places:searchNearby`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": requireGooglePlacesKey(),
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.rating",
            "places.userRatingCount",
            "places.types",
            "places.websiteUri",
            "places.nationalPhoneNumber",
            "places.googleMapsUri",
            "places.currentOpeningHours",
            "places.editorialSummary",
          ].join(","),
        },
        body: JSON.stringify({
          locationRestriction: {
            circle: {
              center: { latitude: center.lat, longitude: center.lon },
              radius: Math.min(radiusMeters, 50000),
            },
          },
          includedTypes,
          maxResultCount: 20,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Places error ${response.status}: ${errorText}`);
      }

      return response.json() as Promise<GooglePlaceSearchTextResponse>;
    },
  });

  return (data.places ?? []).map(normalizeGooglePlace);
}

function normalizeGooglePlace(
  raw: NonNullable<GooglePlaceSearchTextResponse["places"]>[number],
): GooglePlace {
  return {
    place_id: raw.id,
    name: raw.displayName.text,
    address: raw.formattedAddress ?? null,
    location: raw.location
      ? { lat: raw.location.latitude, lon: raw.location.longitude }
      : null,
    rating: raw.rating ?? null,
    rating_count: raw.userRatingCount ?? null,
    price_level: raw.priceLevel ?? null,
    types: raw.types ?? [],
    website: raw.websiteUri ?? null,
    phone: raw.nationalPhoneNumber ?? raw.internationalPhoneNumber ?? null,
    google_maps_url: raw.googleMapsUri ?? null,
    opening_hours: raw.currentOpeningHours?.weekdayDescriptions ?? [],
    editorial_summary: raw.editorialSummary?.text ?? null,
  };
}

function bboxAround(lat: number, lon: number, delta = 0.04): BoundingBox {
  return {
    north: lat + delta,
    south: lat - delta,
    east: lon + delta,
    west: lon - delta,
  };
}

function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = na.split(" ").filter((w) => w.length > 3);
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 3));
  const overlap = wordsA.filter((w) => wordsB.has(w)).length;
  return overlap >= 2 || (wordsA.length === 1 && wordsB.has(wordsA[0]!));
}

/** Resolve Places photo resource names to short-lived CDN URLs (for `<img src>`). */
export async function resolveGooglePhotoMediaUrls(
  photoNames: string[],
  max = 4,
): Promise<string[]> {
  if (!apiEnv.GOOGLE_PLACES_API_KEY || photoNames.length === 0) return [];

  const key = requireGooglePlacesKey();
  const urls: string[] = [];

  for (const photoName of photoNames.slice(0, max)) {
    if (!photoName.startsWith("places/") || !photoName.includes("/photos/")) continue;
    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=480&maxWidthPx=800&skipHttpRedirect=true`,
        { headers: { "X-Goog-Api-Key": key } },
      );
      if (!response.ok) continue;
      const body = (await response.json()) as { photoUri?: string };
      if (body.photoUri) urls.push(body.photoUri);
    } catch {
      /* pojedyncze zdjęcie — kontynuuj */
    }
  }

  return urls;
}

/** Proxy URL for a Places photo resource (served by `/api/places/photo`). */
export function googlePlacePhotoUrl(photoName: string): string {
  return `/api/places/photo?name=${encodeURIComponent(photoName)}`;
}

type GooglePlaceDetailsResponse = {
  id?: string;
  displayName?: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  editorialSummary?: { text: string };
  googleMapsUri?: string;
  websiteUri?: string;
  photos?: Array<{ name: string }>;
  reviews?: Array<{
    rating: number;
    text?: { text: string };
    publishTime?: string;
    authorAttribution?: { displayName: string };
  }>;
};

export async function fetchGooglePlaceDetails(
  placeId: string,
  languageCode = "pl",
): Promise<GooglePlaceDetails | null> {
  if (!apiEnv.GOOGLE_PLACES_API_KEY) return null;

  const resourceName = placeId.startsWith("places/")
    ? placeId
    : `places/${placeId}`;

  try {
    const { data } = await fetchWithCache<GooglePlaceDetailsResponse>({
      source: "google-places-details",
      cacheParams: { place_id: resourceName, languageCode },
      ttlSeconds: 30 * 24 * 60 * 60,
      fetcher: async () => {
        const response = await fetch(
          `${PLACES_API_BASE}/${resourceName}?languageCode=${encodeURIComponent(languageCode)}`,
          {
          method: "GET",
          headers: {
            "X-Goog-Api-Key": requireGooglePlacesKey(),
            "X-Goog-FieldMask": [
              "id",
              "displayName",
              "formattedAddress",
              "rating",
              "userRatingCount",
              "editorialSummary",
              "googleMapsUri",
              "websiteUri",
              "photos",
              "reviews",
            ].join(","),
          },
        });
        if (!response.ok) {
          throw new Error(`Place Details error: ${response.status}`);
        }
        return response.json() as Promise<GooglePlaceDetailsResponse>;
      },
    });

    const reviews = (data.reviews ?? [])
      .map((r) => ({
        author: r.authorAttribution?.displayName?.trim() || "Google user",
        rating: r.rating,
        text: r.text?.text?.trim() ?? "",
        publishedAt: r.publishTime?.substring(0, 10) ?? null,
      }))
      .filter((r) => r.text.length >= 40)
      .sort((a, b) => b.rating - a.rating || b.text.length - a.text.length)
      .slice(0, 4);

    return {
      place_id: data.id ?? resourceName,
      name: data.displayName?.text ?? "",
      editorial_summary: data.editorialSummary?.text?.trim() ?? null,
      rating: data.rating ?? null,
      rating_count: data.userRatingCount ?? null,
      google_maps_url: data.googleMapsUri ?? null,
      website: data.websiteUri ?? null,
      address: data.formattedAddress ?? null,
      photo_names: (data.photos ?? [])
        .map((p) => p.name)
        .filter(Boolean)
        .slice(0, 4),
      reviews,
    };
  } catch {
    return null;
  }
}

export async function findMatchingGooglePlace({
  name,
  lat,
  lon,
  searchVariants,
  maxDistanceKm = 1.5,
  languageCode = "pl",
}: {
  name: string;
  lat: number;
  lon: number;
  searchVariants: string[];
  maxDistanceKm?: number;
  languageCode?: string;
}): Promise<GooglePlace | null> {
  if (!apiEnv.GOOGLE_PLACES_API_KEY) return null;

  const bbox = bboxAround(lat, lon);
  const queries = searchVariants.length > 0 ? searchVariants : [name];

  for (const query of queries.slice(0, 4)) {
    try {
      const places = await searchPlacesByText({ textQuery: query, bbox, languageCode });
      const match = places
        .filter((p) => p.location)
        .map((p) => ({
          p,
          dist: distanceKm({ lat, lon }, p.location!),
          nameOk: namesLikelyMatch(name, p.name),
        }))
        .filter((x) => x.dist <= maxDistanceKm && x.nameOk)
        .sort((a, b) => {
          if (Math.abs(a.dist - b.dist) > 0.15) return a.dist - b.dist;
          return (b.p.rating_count ?? 0) - (a.p.rating_count ?? 0);
        })[0];

      if (match) return match.p;
    } catch {
      /* brak klucza / limit */
    }
  }

  return null;
}
