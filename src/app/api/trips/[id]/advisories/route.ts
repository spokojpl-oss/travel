import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  runAdvisors,
  persistAdvisories,
  SEVERITY_ORDER,
} from "@/lib/advisors";
import type {
  Airport,
  Attraction,
  Destination,
  GroupMember,
  GroupPreferences,
  Hotel,
  Trip,
  TravelGroup,
  WeatherCacheEntry,
} from "@/types/domain";
import type { AdvisorySeverity } from "@/lib/advisors/types";

export const dynamic = "force-dynamic";

type TripWithRelations = Trip & {
  destination: Destination;
  hotel: Pick<
    Hotel,
    "id" | "name" | "lat" | "lon" | "stars" | "address"
  > | null;
  travel_group:
    | (TravelGroup & {
        members: GroupMember[];
        preferences: GroupPreferences | GroupPreferences[] | null;
      })
    | null;
};

function sortAdvisories<
  T extends { severity: AdvisorySeverity; generated_at?: string },
>(advisories: T[]): T[] {
  return [...advisories].sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    if (a.generated_at && b.generated_at) {
      return (
        new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
      );
    }
    return 0;
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: tripId } = await params;

  const { data: advisories } = await supabase
    .from("trip_advisories")
    .select("*")
    .eq("trip_id", tripId)
    .is("dismissed_at", null);

  return NextResponse.json({
    advisories: sortAdvisories(advisories ?? []),
  });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: tripId } = await params;
  const admin = createAdminClient();

  const { data: trip } = await admin
    .from("trips")
    .select(
      `
      *,
      destination:destinations (*),
      hotel:hotels (id, name, lat, lon, stars, address),
      travel_group:travel_groups (
        *,
        members:group_members (*),
        preferences:group_preferences (*)
      )
    `,
    )
    .eq("id", tripId)
    .eq("user_id", user.id)
    .single();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const typedTrip = trip as TripWithRelations;

  const attractionIds = typedTrip.selected_attraction_ids ?? [];
  const { data: attractions } =
    attractionIds.length > 0
      ? await admin.from("attractions").select("*").in("id", attractionIds)
      : { data: [] as Attraction[] };

  const { data: weatherDays } = await admin
    .from("weather_cache")
    .select(
      "forecast_date, temp_max, temp_min, precipitation_mm, precipitation_probability",
    )
    .eq("destination_id", typedTrip.destination_id)
    .gte("forecast_date", typedTrip.date_from)
    .lte("forecast_date", typedTrip.date_to)
    .order("forecast_date");

  let selectedAirport: Airport | undefined;
  const { data: destAirports } = await admin
    .from("destination_airports")
    .select("*, airport:airports (*)")
    .eq("destination_id", typedTrip.destination_id)
    .order("priority")
    .limit(1);

  if (destAirports?.[0]?.airport) {
    selectedAirport = destAirports[0].airport as Airport;
  }

  const travelGroup = typedTrip.travel_group;
  const members = travelGroup?.members ?? [];
  const adults = members.filter((m) => m.member_type === "adult").length || 2;
  const children_ages = members
    .filter((m) => m.member_type === "child")
    .map((m) => m.age)
    .filter((a): a is number => a !== null);

  const rawPreferences = travelGroup?.preferences;
  const preferences = Array.isArray(rawPreferences)
    ? (rawPreferences[0] ?? undefined)
    : (rawPreferences ?? undefined);

  const advisories = await runAdvisors({
    trip: typedTrip,
    destination: typedTrip.destination,
    selectedAttractions: (attractions ?? []) as Attraction[],
    selectedHotel: typedTrip.hotel ?? undefined,
    selectedAirport,
    weatherDays: (weatherDays ?? []) as Pick<
      WeatherCacheEntry,
      | "forecast_date"
      | "temp_max"
      | "temp_min"
      | "precipitation_mm"
      | "precipitation_probability"
    >[],
    group: {
      adults,
      children_ages,
      total: adults + children_ages.length,
    },
    travelGroup: travelGroup ?? undefined,
    preferences,
  });

  await persistAdvisories(tripId, advisories, { replace: true });

  const { data: persisted } = await admin
    .from("trip_advisories")
    .select("*")
    .eq("trip_id", tripId)
    .is("dismissed_at", null);

  return NextResponse.json({
    success: true,
    count: advisories.length,
    advisories: sortAdvisories(persisted ?? []),
  });
}
