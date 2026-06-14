import { fetchWithCache } from "@/lib/cache/api-cache";
import { apiEnv } from "@/config/api-env";
import type { BoundingBox, GeoPoint } from "@/types/domain";

const PLACES_API_BASE = "https://places.googleapis.com/v1";

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
}: {
  textQuery: string;
  bbox: BoundingBox;
  forceRefresh?: boolean;
}): Promise<GooglePlace[]> {
  const { data } = await fetchWithCache<GooglePlaceSearchTextResponse>({
    source: "google-places-search",
    cacheParams: { textQuery, bbox },
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
