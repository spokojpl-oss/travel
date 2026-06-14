import { fetchWithCache } from "@/lib/cache/api-cache";
import { apiEnv } from "@/config/api-env";
import type { Json } from "@/types/database";

const HOTELLOOK_BASE = "https://engine.hotellook.com";
const HOTELLOOK_LOCATIONS_BASE = "https://yasen.hotellook.com/tp/public";

type LookupHotel = {
  id: number;
  fullName: string;
  locationName?: string;
  location: { name?: string; geo?: { lat: number; lon: number } };
  stars?: number;
  pricefrom?: number;
};

type LookupLocation = {
  id: number;
  name: string;
  state?: string | null;
  fullName?: string;
  countryName?: string;
  countryIso?: string;
  iata?: string[];
  hotelsCount?: number;
  location?: { lat: number; lon: number };
  _score?: number;
};

type LookupResponse = {
  status: string;
  results?: {
    locations?: LookupLocation[];
    hotels?: LookupHotel[];
  };
};

type CacheHotel = {
  hotelId: number;
  hotelName: string;
  stars: number;
  priceFrom?: number;
  priceAvg?: number;
  priceMedian?: number;
  location: {
    name: string;
    state?: string | null;
    country: string;
    geo: { lat: number; lon: number };
  };
  locationId: number;
  pricePercentile?: Record<string, number>;
};

export type HotellookNormalizedHotel = {
  external_id: string;
  name: string;
  lat: number;
  lon: number;
  stars: number | null;
  rating: number | null;
  rating_count: number | null;
  address: string | null;
  price_from_pln: number | null;
  price_avg_pln: number | null;
  location_id: number;
  raw: CacheHotel;
};

function requireTravelpayoutsToken(): string {
  const token = apiEnv.TRAVELPAYOUTS_TOKEN;
  if (!token) {
    throw new Error(
      "TRAVELPAYOUTS_TOKEN nie skonfigurowany. Dodaj klucz w env.",
    );
  }
  return token;
}

function requireBookingMarker(): string {
  const marker = apiEnv.TRAVELPAYOUTS_MARKER_BOOKING;
  if (!marker) {
    throw new Error(
      "TRAVELPAYOUTS_MARKER_BOOKING nie skonfigurowany. Dodaj marker w env.",
    );
  }
  return marker;
}

export async function lookupHotellookLocation({
  query,
  forceRefresh = false,
}: {
  query: string;
  forceRefresh?: boolean;
}): Promise<LookupLocation[]> {
  const { data } = await fetchWithCache<LookupResponse>({
    source: "hotellook-lookup",
    cacheParams: { query },
    ttlSeconds: 30 * 24 * 60 * 60,
    forceRefresh,
    fetcher: async () => {
      const params = new URLSearchParams({
        query,
        lang: "en",
        lookFor: "both",
        limit: "10",
        token: requireTravelpayoutsToken(),
      });
      const response = await fetch(
        `${HOTELLOOK_BASE}/api/v2/lookup.json?${params}`,
      );
      if (!response.ok) {
        throw new Error(`Hotellook lookup error: ${response.status}`);
      }
      return response.json() as Promise<LookupResponse>;
    },
  });

  return data.results?.locations ?? [];
}

export async function lookupHotellookByCoords({
  lat,
  lon,
  forceRefresh = false,
}: {
  lat: number;
  lon: number;
  forceRefresh?: boolean;
}): Promise<LookupLocation[]> {
  const { data } = await fetchWithCache<LookupLocation[]>({
    source: "hotellook-locations-coords",
    cacheParams: { lat, lon },
    ttlSeconds: 30 * 24 * 60 * 60,
    forceRefresh,
    fetcher: async () => {
      const params = new URLSearchParams({
        query: `${lat},${lon}`,
        limit: "5",
        token: requireTravelpayoutsToken(),
      });
      const response = await fetch(
        `${HOTELLOOK_LOCATIONS_BASE}/widget_locations?${params}`,
      );
      if (!response.ok) {
        throw new Error(
          `Hotellook locations-by-coords error: ${response.status}`,
        );
      }
      return response.json() as Promise<LookupLocation[]>;
    },
  });

  return data;
}

export async function fetchHotelsForLocation({
  locationName,
  checkIn,
  checkOut,
  adults,
  children = 0,
  limit = 40,
  forceRefresh = false,
}: {
  locationName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  limit?: number;
  forceRefresh?: boolean;
}): Promise<HotellookNormalizedHotel[]> {
  const { data } = await fetchWithCache<CacheHotel[]>({
    source: "hotellook-cache",
    cacheParams: { locationName, checkIn, checkOut, adults, children, limit },
    ttlSeconds: 6 * 60 * 60,
    forceRefresh,
    fetcher: async () => {
      const params = new URLSearchParams({
        location: locationName,
        currency: "pln",
        checkIn,
        checkOut,
        adults: String(adults),
        children: String(children),
        limit: String(limit),
        token: requireTravelpayoutsToken(),
      });
      const response = await fetch(
        `${HOTELLOOK_BASE}/api/v2/cache.json?${params}`,
      );
      if (!response.ok) {
        throw new Error(`Hotellook cache error: ${response.status}`);
      }
      const json = await response.json();
      if (Array.isArray(json)) return json as CacheHotel[];
      if (Array.isArray(json.hotels)) return json.hotels as CacheHotel[];
      return [];
    },
  });

  return data.map(normalizeHotellookHotel);
}

function normalizeHotellookHotel(h: CacheHotel): HotellookNormalizedHotel {
  return {
    external_id: String(h.hotelId),
    name: h.hotelName,
    lat: h.location.geo.lat,
    lon: h.location.geo.lon,
    stars: h.stars > 0 ? h.stars : null,
    rating: null,
    rating_count: null,
    address: h.location.name
      ? `${h.location.name}${h.location.country ? ", " + h.location.country : ""}`
      : null,
    price_from_pln: h.priceFrom ?? null,
    price_avg_pln: h.priceAvg ?? null,
    location_id: h.locationId,
    raw: h,
  };
}

export function buildHotellookDeepLink({
  hotelId,
  checkIn,
  checkOut,
  adults,
  children = 0,
}: {
  hotelId: string | number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
}): string {
  const url = new URL("https://search.hotellook.com/");
  url.searchParams.set("marker", requireBookingMarker());
  url.searchParams.set("hotelId", String(hotelId));
  url.searchParams.set("checkIn", checkIn);
  url.searchParams.set("checkOut", checkOut);
  url.searchParams.set("adults", String(adults));
  if (children > 0) url.searchParams.set("children", String(children));
  return url.toString();
}

export async function persistHotelsAndOffers({
  hotels,
  destinationId,
  checkIn,
  checkOut,
  adults,
  children = 0,
}: {
  hotels: HotellookNormalizedHotel[];
  destinationId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
}): Promise<{ hotels_saved: number; offers_saved: number }> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  if (hotels.length === 0) return { hotels_saved: 0, offers_saved: 0 };

  const hotelRows = hotels.map((h) => ({
    external_id: h.external_id,
    source: "hotellook",
    name: h.name,
    lat: h.lat,
    lon: h.lon,
    stars: h.stars,
    rating: h.rating,
    rating_count: h.rating_count,
    address: h.address,
    destination_id: destinationId,
    amenities: {} as Json,
    raw_data: h.raw as unknown as Json,
  }));

  const { data: savedHotels, error: hotelError } = await supabase
    .from("hotels")
    .upsert(hotelRows, { onConflict: "source,external_id" })
    .select("id, external_id");

  if (hotelError) throw new Error(`Hotels upsert failed: ${hotelError.message}`);
  if (!savedHotels) return { hotels_saved: 0, offers_saved: 0 };

  const idMap = new Map(savedHotels.map((h) => [h.external_id, h.id]));

  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

  const offerRows = hotels
    .filter((h) => h.price_from_pln !== null && idMap.has(h.external_id))
    .map((h) => {
      const hotelId = idMap.get(h.external_id)!;
      const priceTotal = h.price_from_pln!;
      return {
        cache_key: `hotellook:${h.external_id}:${checkIn}:${checkOut}:${adults}:${children}`,
        hotel_id: hotelId,
        check_in: checkIn,
        check_out: checkOut,
        nights,
        adults,
        children,
        price_total_pln: priceTotal,
        price_per_night_pln: Math.round(priceTotal / nights),
        deep_link: buildHotellookDeepLink({
          hotelId: h.external_id,
          checkIn,
          checkOut,
          adults,
          children,
        }),
        breakfast_included: null,
        cancellation_policy: null,
        source: "hotellook",
        raw_data: {
          price_avg: h.price_avg_pln,
          location_id: h.location_id,
        } as Json,
        expires_at: expiresAt,
      };
    });

  if (offerRows.length === 0) {
    return { hotels_saved: savedHotels.length, offers_saved: 0 };
  }

  const { error: offerError } = await supabase
    .from("hotel_offers_cache")
    .upsert(offerRows, { onConflict: "cache_key" });

  if (offerError) throw new Error(`Offers upsert failed: ${offerError.message}`);

  return { hotels_saved: savedHotels.length, offers_saved: offerRows.length };
}
