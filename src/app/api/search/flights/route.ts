import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrFindDestinationAirports } from "@/lib/flights/airport-finder";
import { flexibleFlightSearch } from "@/lib/flights/flexible-search";
import { POLISH_AIRPORT_IATAS } from "@/lib/flights/polish-airports";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BoundingBox } from "@/types/domain";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  destination_id: z.string().uuid(),
  origins: z.array(z.string().length(3)).optional(),
  departure_date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departure_date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  trip_length_min_days: z.number().int().min(1).max(60).optional(),
  trip_length_max_days: z.number().int().min(1).max(60).optional(),
  max_origins: z.number().int().min(1).max(8).default(4),
  max_destinations: z.number().int().min(1).max(5).default(3),
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
  });

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
        warning: "Brak lotnisk w pobliżu destynacji",
      },
    });
  }

  const origins = parsed.data.origins ?? POLISH_AIRPORT_IATAS.slice(0, 7);
  const destinations = destinationAirports
    .slice(0, parsed.data.max_destinations)
    .map((a) => a.iata_code);

  try {
    const result = await flexibleFlightSearch({
      origins: origins.slice(0, parsed.data.max_origins),
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
    });

    return NextResponse.json({
      result,
      meta: {
        destination_id: destination.id,
        destination_name: destination.name,
        destination_airports: destinationAirports,
        searched_origins: origins.slice(0, parsed.data.max_origins),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Flight search failed",
      },
      { status: 500 },
    );
  }
}
