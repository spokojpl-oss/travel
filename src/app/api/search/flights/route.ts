import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrFindDestinationAirports, resolveFlightSearchAirports } from "@/lib/flights/airport-finder";
import { flexibleFlightSearch } from "@/lib/flights/flexible-search";
import { POLISH_AIRPORT_IATAS } from "@/lib/flights/polish-airports";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BoundingBox } from "@/types/domain";
import type { FlightOffer } from "@/lib/api/travelpayouts";
import { buildAviasalesAppLink } from "@/lib/api/travelpayouts";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  destination_id: z.string().uuid(),
  origins: z.array(z.string().length(3)).optional(),
  departure_date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departure_date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  trip_length_min_days: z.number().int().min(1).max(60).optional(),
  trip_length_max_days: z.number().int().min(1).max(60).optional(),
  max_origins: z.number().int().min(1).max(16).optional(),
  max_destinations: z.number().int().min(1).max(5).default(3),
  adults: z.number().int().min(1).max(9).default(1),
  children: z.number().int().min(0).max(9).default(0),
  infants: z.number().int().min(0).max(9).default(0),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: destination } = await admin
    .from("destinations")
    .select("*")
    .eq("id", parsed.data.destination_id)
    .single();

  if (!destination) {
    return NextResponse.json({ error: "Destination not found" }, { status: 404 });
  }

  const bbox = destination.bounding_box as BoundingBox;

  const destinationAirports = await getOrFindDestinationAirports({
    destinationId: destination.id,
    center: { lat: destination.center_lat, lon: destination.center_lon },
    bbox,
    destinationLabel: destination.name,
  });

  const airportPlan = resolveFlightSearchAirports(
    destination.name,
    { lat: destination.center_lat, lon: destination.center_lon },
    destinationAirports,
  );

  const defaultOrigins = [...POLISH_AIRPORT_IATAS];
  const origins = parsed.data.origins ?? defaultOrigins;
  const maxOrigins =
    parsed.data.max_origins ??
    (parsed.data.origins ? parsed.data.origins.length : defaultOrigins.length);
  const searchedOrigins = origins.slice(0, maxOrigins);

  // #region agent log
  fetch("http://127.0.0.1:7245/ingest/173647fd-e041-4dc5-8254-79e68a12fc0f", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "d400df",
    },
    body: JSON.stringify({
      sessionId: "d400df",
      runId: "pre-fix",
      hypothesisId: "B",
      location: "flights/route.ts:airportPlan",
      message: "Flight search airport plan",
      data: {
        destinationName: destination.name,
        localAirports: airportPlan.localAirports.map((a) => a.iata_code),
        searchDestinations: airportPlan.searchDestinations,
        gatewayAirports: airportPlan.gatewayAirports,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (destinationAirports.length === 0) {
    return NextResponse.json({
      result: {
        all_offers: [],
        cheapest: [],
        price_calendar: [],
        suggestions: [],
      },
      meta: {
        destination_id: destination.id,
        destination_name: destination.name,
        destination_airports: [],
        searched_origins: searchedOrigins,
        warning: "Brak lotnisk w pobliżu destynacji",
      },
    });
  }

  const destinations = airportPlan.searchDestinations.slice(
    0,
    parsed.data.max_destinations,
  );

  const passengers = {
    adults: parsed.data.adults,
    children: parsed.data.children,
    infants: parsed.data.infants,
  };

  try {
    const result = await flexibleFlightSearch({
      origins: origins.slice(0, maxOrigins),
      destinations,
      departureDateRange: {
        start: parsed.data.departure_date_from,
        end: parsed.data.departure_date_to,
      },
      tripLengthDays:
        parsed.data.trip_length_min_days && parsed.data.trip_length_max_days
          ? {
              min: parsed.data.trip_length_min_days,
              max: parsed.data.trip_length_max_days,
            }
          : undefined,
      passengers,
    });

    const meta = {
      destination_id: destination.id,
      destination_name: destination.name,
      destination_airports: airportPlan.localAirports,
      searched_destinations: destinations,
      gateway_airports: airportPlan.gatewayAirports,
      searched_origins: searchedOrigins,
    };

    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/173647fd-e041-4dc5-8254-79e68a12fc0f", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "d400df",
      },
      body: JSON.stringify({
        sessionId: "d400df",
        runId: "pre-fix",
        hypothesisId: "A",
        location: "flights/route.ts:success",
        message: "Flight search API success",
        data: {
          destinations,
          offerCount: result.all_offers.length,
          cheapestCount: result.cheapest.length,
          dateFrom: parsed.data.departure_date_from,
          dateTo: parsed.data.departure_date_to,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return NextResponse.json({ result, meta });
  } catch (error) {
    // #region agent log
    fetch("http://127.0.0.1:7245/ingest/173647fd-e041-4dc5-8254-79e68a12fc0f", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "d400df",
      },
      body: JSON.stringify({
        sessionId: "d400df",
        runId: "pre-fix",
        hypothesisId: "D",
        location: "flights/route.ts:catch",
        message: "Flight search API error",
        data: {
          error: error instanceof Error ? error.message : String(error),
          destinations,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const { data: cached } = await admin
      .from("flight_offers_cache")
      .select("*")
      .in("origin_iata", origins.slice(0, maxOrigins))
      .in("destination_iata", destinations)
      .gte("departure_date", parsed.data.departure_date_from)
      .lte("departure_date", parsed.data.departure_date_to)
      .order("price_pln", { ascending: true })
      .limit(20);

    if (cached && cached.length > 0) {
      const offers = cached.map((row) =>
        cacheRowToFlightOffer(row, passengers),
      );

      return NextResponse.json({
        result: {
          all_offers: offers,
          cheapest: offers.slice(0, 5),
          price_calendar: [],
          suggestions: [],
        },
        meta: {
          destination_id: destination.id,
          destination_name: destination.name,
          destination_airports: airportPlan.localAirports,
          searched_destinations: destinations,
          gateway_airports: airportPlan.gatewayAirports,
          searched_origins: searchedOrigins,
          warning:
            "API niedostępne, pokazuję ostatnie znane ceny. Dane mogą być nieaktualne.",
          fallback_used: true,
          oldest_fetched_at: cached[cached.length - 1]?.fetched_at,
        },
      });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Flight search failed",
        fallback_used: false,
      },
      { status: 503 },
    );
  }
}

function cacheRowToFlightOffer(
  row: {
    origin_iata: string;
    destination_iata: string;
    price_pln: number;
    airline_code: string | null;
    departure_date: string;
    return_date: string | null;
    transfers: number;
    duration_minutes: number | null;
    deep_link: string;
  },
  passengers: { adults: number; children: number; infants: number },
): FlightOffer {
  return {
    origin_iata: row.origin_iata,
    destination_iata: row.destination_iata,
    price_pln: row.price_pln,
    currency_original: "PLN",
    price_original: row.price_pln,
    airline_code: row.airline_code,
    flight_number: null,
    departure_date: row.departure_date,
    return_date: row.return_date,
    transfers: row.transfers,
    duration_minutes: row.duration_minutes,
    deep_link: buildAviasalesAppLink({
      origin: row.origin_iata,
      destination: row.destination_iata,
      departureDate: row.departure_date,
      returnDate: row.return_date,
      adults: passengers.adults,
      children: passengers.children,
      infants: passengers.infants,
    }),
    source: "aviasales",
  };
}
