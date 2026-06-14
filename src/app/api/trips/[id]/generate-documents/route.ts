import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateItinerary, CLAUDE_MODEL } from "@/lib/trips/generate-itinerary";
import { generatePackingList } from "@/lib/trips/generate-packing-list";
import { generatePreTripTodo } from "@/lib/trips/generate-pre-trip-todo";
import { enrichAttractionsForTrip } from "@/lib/trips/enrich-attractions";
import type { Json } from "@/types/database";
import type { Destination, TravelStyle } from "@/types/domain";

export const dynamic = "force-dynamic";

type TravelGroupWithMembers = {
  members: Array<{ member_type: string; age: number | null }>;
  preferences: { travel_style: TravelStyle } | null;
};

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

  const { data: trip, error: tripError } = await admin
    .from("trips")
    .select(
      `
      *,
      destination:destinations (*),
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

  if (tripError || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const { data: rawAttractions } = await admin
    .from("attractions")
    .select(
      "id, name, category, duration_minutes, description, activity_tags:attraction_activity_tags(activity_slug)",
    )
    .in("id", trip.selected_attraction_ids ?? []);

  const { data: activities } = await admin
    .from("activities")
    .select("slug, intensity");

  const attractions = enrichAttractionsForTrip(
    rawAttractions ?? [],
    activities ?? [],
  );

  const { data: weatherDays } = await admin
    .from("weather_cache")
    .select("*")
    .eq("destination_id", trip.destination_id)
    .gte("forecast_date", trip.date_from)
    .lte("forecast_date", trip.date_to)
    .order("forecast_date");

  const travelGroup = trip.travel_group as TravelGroupWithMembers | null;
  const adults =
    travelGroup?.members?.filter((m) => m.member_type === "adult").length ?? 2;
  const children_ages = (
    travelGroup?.members?.filter((m) => m.member_type === "child") ?? []
  )
    .map((m) => m.age)
    .filter((a): a is number => a !== null);
  const travel_style = travelGroup?.preferences?.travel_style ?? "mixed";
  const groupInfo = { adults, children_ages, travel_style };

  let weatherSummary;
  if (weatherDays && weatherDays.length > 0) {
    const tempMax = weatherDays.map((w) => Number(w.temp_max ?? 0));
    const tempMin = weatherDays.map((w) => Number(w.temp_min ?? 0));
    const precip = weatherDays.map((w) => Number(w.precipitation_mm ?? 0));
    const uv = weatherDays.map((w) => Number(w.uv_index_max ?? 0));
    weatherSummary = {
      destination_id: trip.destination_id,
      date_from: trip.date_from,
      date_to: trip.date_to,
      avg_temp_max:
        Math.round(
          (tempMax.reduce((s, n) => s + n, 0) / tempMax.length) * 10,
        ) / 10,
      avg_temp_min:
        Math.round(
          (tempMin.reduce((s, n) => s + n, 0) / tempMin.length) * 10,
        ) / 10,
      total_precipitation_mm: Math.round(precip.reduce((s, n) => s + n, 0)),
      rainy_days: precip.filter((p) => p > 1).length,
      avg_uv_index:
        uv.length > 0
          ? Math.round((uv.reduce((s, n) => s + n, 0) / uv.length) * 10) / 10
          : 0,
      fetched_at: new Date().toISOString(),
    };
  }

  const destination = trip.destination as Destination;
  const results: Record<string, unknown> = {};

  try {
    const { itinerary, validation, usage } = await generateItinerary({
      trip,
      destination,
      attractions,
      weatherDays: weatherDays?.map((w) => ({
        date: w.forecast_date,
        temp_max: Number(w.temp_max ?? 0),
        temp_min: Number(w.temp_min ?? 0),
        precipitation_mm: Number(w.precipitation_mm ?? 0),
      })),
      groupInfo,
    });

    await admin.from("trip_documents").upsert(
      {
        trip_id: tripId,
        document_type: "itinerary",
        content: itinerary as unknown as Json,
        validation_issues: validation.issues,
        model_used: CLAUDE_MODEL,
        tokens_used: usage as unknown as Json,
      },
      { onConflict: "trip_id,document_type" },
    );
    results.itinerary = {
      generated: true,
      validation_issues: validation.issues.length,
    };
  } catch (e) {
    results.itinerary = {
      error: e instanceof Error ? e.message : "Failed",
    };
  }

  try {
    const { list, usage } = await generatePackingList({
      destination,
      attractions,
      weatherSummary,
      weatherDays: weatherDays?.map((w) => ({
        date: w.forecast_date,
        temp_max: Number(w.temp_max ?? 0),
        temp_min: Number(w.temp_min ?? 0),
        precipitation_mm: Number(w.precipitation_mm ?? 0),
        uv_index_max: Number(w.uv_index_max ?? 0),
        wind_speed_kmh: Number(w.wind_speed_kmh ?? 0),
      })),
      groupInfo,
    });

    await admin.from("trip_documents").upsert(
      {
        trip_id: tripId,
        document_type: "packing_list",
        content: list as unknown as Json,
        validation_issues: [],
        model_used: CLAUDE_MODEL,
        tokens_used: usage as unknown as Json,
      },
      { onConflict: "trip_id,document_type" },
    );
    results.packing_list = { generated: true };
  } catch (e) {
    results.packing_list = {
      error: e instanceof Error ? e.message : "Failed",
    };
  }

  try {
    const { todo, usage } = await generatePreTripTodo({
      destination,
      tripDateFrom: trip.date_from,
      groupInfo,
    });

    await admin.from("trip_documents").upsert(
      {
        trip_id: tripId,
        document_type: "pre_trip_todo",
        content: todo as unknown as Json,
        validation_issues: [],
        model_used: CLAUDE_MODEL,
        tokens_used: usage as unknown as Json,
      },
      { onConflict: "trip_id,document_type" },
    );
    results.pre_trip_todo = { generated: true };
  } catch (e) {
    results.pre_trip_todo = {
      error: e instanceof Error ? e.message : "Failed",
    };
  }

  return NextResponse.json({ success: true, results });
}
