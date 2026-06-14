import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTransportOptionsFromAirport } from "@/lib/transport/airport-transport";
import { recommendGroupVehicles } from "@/lib/cars/group-vehicle-recommender";
import { buildDiscoverCarsDeepLink } from "@/lib/api/discovercars";
import { logSearch } from "@/lib/history/log-search";

const schema = z.object({
  airport_iata: z.string().length(3),
  destination_id: z.string().uuid(),
  to_location_name: z.string(),
  to_lat: z.number(),
  to_lon: z.number(),
  pickup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(20),
  children_ages: z.array(z.number().int().min(0).max(17)).default([]),
  has_sports_baggage: z.boolean().default(false),
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: airport } = await admin
    .from("airports")
    .select("*")
    .eq("iata_code", parsed.data.airport_iata)
    .single();

  if (!airport) {
    return NextResponse.json({ error: "Airport not found" }, { status: 404 });
  }

  const totalPassengers =
    parsed.data.adults + parsed.data.children_ages.length;
  const childrenUnder12 = parsed.data.children_ages.filter((a) => a < 12).length;
  const durationDays = Math.max(
    1,
    Math.round(
      (new Date(parsed.data.return_date).getTime() -
        new Date(parsed.data.pickup_date).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  const discoverCarsLink = buildDiscoverCarsDeepLink({
    pickupLocation: airport.iata_code,
    pickupDate: parsed.data.pickup_date,
    returnDate: parsed.data.return_date,
    driverAge: 35,
    pickupLat: Number(airport.lat),
    pickupLon: Number(airport.lon),
  });

  const transportOptions = await getTransportOptionsFromAirport({
    airportIata: airport.iata_code,
    airportLat: Number(airport.lat),
    airportLon: Number(airport.lon),
    toLocation: parsed.data.to_location_name,
    toLat: parsed.data.to_lat,
    toLon: parsed.data.to_lon,
    date: parsed.data.pickup_date,
    passengers: totalPassengers,
    includeCarRental: true,
  });

  const transportWithLinks = transportOptions.map((opt) =>
    opt.type === "rental_car" ? { ...opt, deep_link: discoverCarsLink } : opt,
  );

  const vehicleOptions = recommendGroupVehicles({
    groupSize: totalPassengers,
    childrenUnder12,
    hasSportsBaggage: parsed.data.has_sports_baggage,
    durationDays,
  });

  const vehicleOptionsWithLinks = vehicleOptions.map((opt) => ({
    ...opt,
    discover_cars_link:
      opt.configuration !== "transfer" ? discoverCarsLink : null,
    estimated_total_for_period_pln: Math.round(
      opt.estimated_daily_total_pln * durationDays,
    ),
  }));

  const responseBody = {
    airport: {
      iata: airport.iata_code,
      name: airport.name,
      city: airport.city,
      country: airport.country_code,
    },
    duration_days: durationDays,
    transport_from_airport: transportWithLinks,
    vehicle_recommendations: vehicleOptionsWithLinks,
    meta: {
      total_passengers: totalPassengers,
      children_under_12: childrenUnder12,
      has_sports_baggage: parsed.data.has_sports_baggage,
    },
  };

  logSearch({
    userId: user.id,
    searchType: "transport",
    params: parsed.data,
    resultSummary: {
      transport_options: transportWithLinks.length,
      vehicle_options: vehicleOptionsWithLinks.length,
    },
  }).catch(() => {});

  return NextResponse.json(responseBody);
}
