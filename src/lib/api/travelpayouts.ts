import { fetchWithCache } from "@/lib/cache/api-cache";
import { getTravelpayoutsPartnerMarker, apiEnv } from "@/config/api-env";

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

export type FlightPassengers = {
  adults?: number;
  children?: number;
  infants?: number;
};

export async function fetchPriceCalendar({
  origin,
  destination,
  departureMonth,
  oneWay = false,
  forceRefresh = false,
  passengers = {},
}: {
  origin: string;
  destination: string;
  departureMonth: string;
  oneWay?: boolean;
  forceRefresh?: boolean;
  passengers?: FlightPassengers;
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
        market: "pl",
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

  const adults = passengers.adults ?? 1;
  const children = passengers.children ?? 0;
  const infants = passengers.infants ?? 0;

  const offers = Object.entries(data.data ?? {}).map(([, offer]) => ({
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
    deep_link: buildAviasalesAppLink({
      origin,
      destination,
      departureDate: offer.departure_at.split("T")[0],
      returnDate: offer.return_at?.split("T")[0] ?? null,
      adults,
      children,
      infants,
    }),
    source: "aviasales" as const,
  }));

  return offers;
}

export async function fetchCheapestFlights({
  origin,
  destination,
  departureDate,
  returnDate,
  forceRefresh = false,
  passengers = {},
}: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  forceRefresh?: boolean;
  passengers?: FlightPassengers;
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
        market: "pl",
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
  const adults = passengers.adults ?? 1;
  const children = passengers.children ?? 0;
  const infants = passengers.infants ?? 0;

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
      deep_link: buildAviasalesAppLink({
        origin,
        destination,
        departureDate: offer.departure_at.split("T")[0],
        returnDate: offer.return_at?.split("T")[0] ?? null,
        adults,
        children,
        infants,
      }),
      source: "aviasales" as const,
    });
  }

  return offers;
}

export type AviasalesLinkParams = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  adults?: number;
  children?: number;
  infants?: number;
};

/** DDMM z ISO (np. 2026-07-10 → 1007) — format ścieżki Aviasales. */
function aviasalesRouteDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}${month}`;
}

/** Skrócona trasa w parametrze params= (GDN1007FAO1707121). */
function buildAviasalesCompactRoute({
  origin,
  destination,
  departureDate,
  returnDate,
  adults = 1,
}: AviasalesLinkParams): string {
  let route = `${origin.toUpperCase()}${aviasalesRouteDate(departureDate)}${destination.toUpperCase()}`;
  if (returnDate) route += aviasalesRouteDate(returnDate);
  route += String(adults);
  return route;
}

/**
 * Link do wyszukiwania na Aviasales.
 * /searches/new zwraca 404 — używamy polskiej domeny + query params + with_request=true.
 */
export function buildAviasalesSearchUrl({
  origin,
  destination,
  departureDate,
  returnDate,
  adults = 1,
  children = 0,
  infants = 0,
}: AviasalesLinkParams): string {
  const params = new URLSearchParams({
    origin_iata: origin.toUpperCase(),
    destination_iata: destination.toUpperCase(),
    depart_date: departureDate,
    adults: String(adults),
    children: String(children),
    infants: String(infants),
    trip_class: "0",
    currency: "PLN",
    locale: "pl",
    language: "pl",
    with_request: "true",
    params: buildAviasalesCompactRoute({
      origin,
      destination,
      departureDate,
      returnDate,
      adults,
    }),
  });

  if (returnDate) {
    params.set("return_date", returnDate);
    params.set("one_way", "false");
  } else {
    params.set("one_way", "true");
  }

  const marker = getTravelpayoutsPartnerMarker();
  if (marker) params.set("marker", marker);

  return `https://www.aviasales.pl/?${params.toString()}`;
}

/** Krótki link w aplikacji → /api/out/aviasales (serwer robi redirect). */
export function buildAviasalesAppLink(params: AviasalesLinkParams): string {
  const sp = new URLSearchParams({
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    dep: params.departureDate,
  });
  if (params.returnDate) sp.set("ret", params.returnDate);
  if (params.adults && params.adults !== 1) sp.set("adults", String(params.adults));
  if (params.children && params.children > 0) {
    sp.set("children", String(params.children));
  }
  if (params.infants && params.infants > 0) sp.set("infants", String(params.infants));
  return `/api/out/aviasales?${sp.toString()}`;
}

/** @deprecated Użyj buildAviasalesAppLink w UI lub buildAviasalesSearchUrl na serwerze. */
export function buildAviasalesDeepLink(params: AviasalesLinkParams): string {
  return buildAviasalesAppLink(params);
}
