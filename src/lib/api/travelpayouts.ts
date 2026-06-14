import { fetchWithCache } from "@/lib/cache/api-cache";
import { apiEnv } from "@/config/api-env";

const AVIATION_BASE = "https://api.travelpayouts.com";

type TravelpayoutsCalendarResponse = {
  success: boolean;
  data: Record<
    string,
    {
      price: number;
      airline: string;
      flight_number: string | number;
      departure_at: string;
      return_at: string | null;
      transfers: number;
      expires_at: string;
    }
  >;
  currency: string;
  error?: string;
};

type TravelpayoutsCheapResponse = {
  success: boolean;
  data: Record<
    string,
    Record<
      string,
      {
        price: number;
        airline: string;
        flight_number: number | string;
        departure_at: string;
        return_at: string | null;
        expires_at: string;
      }
    >
  >;
  currency: string;
};

export type FlightOffer = {
  origin_iata: string;
  destination_iata: string;
  price_pln: number;
  currency_original: string;
  price_original: number;
  airline_code: string | null;
  flight_number: string | null;
  departure_date: string;
  return_date: string | null;
  transfers: number;
  duration_minutes: number | null;
  deep_link: string;
  source: "aviasales";
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

function requireAviasalesMarker(): string {
  const marker = apiEnv.TRAVELPAYOUTS_MARKER_AVIASALES;
  if (!marker) {
    throw new Error(
      "TRAVELPAYOUTS_MARKER_AVIASALES nie skonfigurowany. Dodaj marker w env.",
    );
  }
  return marker;
}

export async function fetchPriceCalendar({
  origin,
  destination,
  departureMonth,
  oneWay = false,
  forceRefresh = false,
}: {
  origin: string;
  destination: string;
  departureMonth: string;
  oneWay?: boolean;
  forceRefresh?: boolean;
}): Promise<FlightOffer[]> {
  const { data } = await fetchWithCache<TravelpayoutsCalendarResponse>({
    source: "travelpayouts-calendar",
    cacheParams: { origin, destination, departureMonth, oneWay },
    ttlSeconds: 6 * 60 * 60,
    forceRefresh,
    fetcher: async () => {
      const params = new URLSearchParams({
        origin,
        destination,
        departure_at: departureMonth,
        one_way: oneWay ? "true" : "false",
        currency: "pln",
        token: requireTravelpayoutsToken(),
      });
      const response = await fetch(
        `${AVIATION_BASE}/aviasales/v3/prices_for_dates?${params}`,
      );
      if (!response.ok) {
        throw new Error(`Travelpayouts calendar error: ${response.status}`);
      }
      return response.json() as Promise<TravelpayoutsCalendarResponse>;
    },
  });

  if (!data.success) {
    if (data.error) throw new Error(`Travelpayouts: ${data.error}`);
    return [];
  }

  return Object.entries(data.data ?? {}).map(([, offer]) => ({
    origin_iata: origin,
    destination_iata: destination,
    price_pln: offer.price,
    currency_original: "PLN",
    price_original: offer.price,
    airline_code: offer.airline,
    flight_number: String(offer.flight_number),
    departure_date: offer.departure_at.split("T")[0],
    return_date: offer.return_at?.split("T")[0] ?? null,
    transfers: offer.transfers,
    duration_minutes: null,
    deep_link: buildAviasalesDeepLink({
      origin,
      destination,
      departureDate: offer.departure_at.split("T")[0],
      returnDate: offer.return_at?.split("T")[0] ?? null,
      adults: 1,
    }),
    source: "aviasales" as const,
  }));
}

export async function fetchCheapestFlights({
  origin,
  destination,
  departureDate,
  returnDate,
  forceRefresh = false,
}: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  forceRefresh?: boolean;
}): Promise<FlightOffer[]> {
  const { data } = await fetchWithCache<TravelpayoutsCheapResponse>({
    source: "travelpayouts-cheap",
    cacheParams: { origin, destination, departureDate, returnDate },
    ttlSeconds: 60 * 60,
    forceRefresh,
    fetcher: async () => {
      const params = new URLSearchParams({
        origin,
        destination,
        depart_date: departureDate,
        currency: "pln",
        token: requireTravelpayoutsToken(),
      });
      if (returnDate) params.set("return_date", returnDate);

      const response = await fetch(
        `${AVIATION_BASE}/v1/prices/cheap?${params}`,
      );
      if (!response.ok) {
        throw new Error(`Travelpayouts cheap error: ${response.status}`);
      }
      return response.json() as Promise<TravelpayoutsCheapResponse>;
    },
  });

  if (!data.success) return [];

  const offers: FlightOffer[] = [];
  const destinationData = data.data?.[destination] ?? {};

  for (const [, offer] of Object.entries(destinationData)) {
    offers.push({
      origin_iata: origin,
      destination_iata: destination,
      price_pln: offer.price,
      currency_original: "PLN",
      price_original: offer.price,
      airline_code: offer.airline,
      flight_number: String(offer.flight_number),
      departure_date: offer.departure_at.split("T")[0],
      return_date: offer.return_at?.split("T")[0] ?? null,
      transfers: 0,
      duration_minutes: null,
      deep_link: buildAviasalesDeepLink({
        origin,
        destination,
        departureDate: offer.departure_at.split("T")[0],
        returnDate: offer.return_at?.split("T")[0] ?? null,
        adults: 1,
      }),
      source: "aviasales" as const,
    });
  }

  return offers;
}

export function buildAviasalesDeepLink({
  origin,
  destination,
  departureDate,
  returnDate,
  adults = 1,
  children = 0,
  infants = 0,
}: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  adults?: number;
  children?: number;
  infants?: number;
}): string {
  const formatDate = (date: string) => {
    const [, m, d] = date.split("-");
    return `${d}${m}`;
  };

  const dep = formatDate(departureDate);
  const ret = returnDate ? formatDate(returnDate) : "";

  let route = `${origin}${dep}${destination}`;
  if (ret) route += ret;
  route += String(adults);
  if (children > 0) route += String(children);
  if (infants > 0) route += String(infants);

  const url = new URL(`https://www.aviasales.com/search/${route}`);
  url.searchParams.set("marker", requireAviasalesMarker());
  return url.toString();
}
