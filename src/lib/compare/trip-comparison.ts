import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type TripComparison = {
  trip_id: string;
  name: string;
  destination_name: string;
  country_code: string;
  date_from: string;
  date_to: string;
  nights: number;
  metrics: {
    flight_min_pln: number | null;
    hotel_total_pln: number | null;
    hotel_per_night_pln: number | null;
    real_total_cost_pln: number | null;
    direct_flight_available: boolean;
    weather_temp_max_avg: number | null;
    weather_rainy_days: number | null;
    attractions_count: number;
    advisories_count: {
      critical: number;
      warning: number;
      suggestion: number;
      info: number;
    };
    top_advisory_title: string | null;
  };
};

type AdminClient = SupabaseClient<Database>;

export async function buildTripComparison(
  tripIds: string[],
): Promise<TripComparison[]> {
  const supabase = createAdminClient();

  const trips = await Promise.all(
    tripIds.map(async (id) => {
      const { data: trip } = await supabase
        .from("trips")
        .select(
          `
          *,
          destination:destinations (*),
          hotel:hotels (id, name)
        `,
        )
        .eq("id", id)
        .single();

      if (!trip) return null;

      const nights = Math.round(
        (new Date(trip.date_to).getTime() -
          new Date(trip.date_from).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const flightMin = trip.selected_flight_offer_id
        ? await getFlightPrice(supabase, trip.selected_flight_offer_id)
        : null;

      let directFlight = false;
      if (trip.selected_flight_offer_id) {
        const { data: flightOffer } = await supabase
          .from("flight_offers_cache")
          .select("transfers")
          .eq("id", trip.selected_flight_offer_id)
          .single();
        directFlight = flightOffer?.transfers === 0;
      }

      let hotelTotal: number | null = null;
      let hotelPerNight: number | null = null;
      if (trip.selected_hotel_offer_id) {
        const { data: offer } = await supabase
          .from("hotel_offers_cache")
          .select("price_total_pln, price_per_night_pln")
          .eq("hotel_id", trip.selected_hotel_offer_id)
          .eq("check_in", trip.date_from)
          .eq("check_out", trip.date_to)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        hotelTotal = offer?.price_total_pln ?? null;
        hotelPerNight = offer?.price_per_night_pln ?? null;
      }

      const { data: weatherDays } = await supabase
        .from("weather_cache")
        .select("temp_max, precipitation_mm")
        .eq("destination_id", trip.destination_id)
        .gte("forecast_date", trip.date_from)
        .lte("forecast_date", trip.date_to);

      const tempMaxAvg =
        weatherDays && weatherDays.length > 0
          ? Math.round(
              weatherDays.reduce(
                (s, w) => s + Number(w.temp_max ?? 0),
                0,
              ) / weatherDays.length,
            )
          : null;
      const rainyDays = weatherDays
        ? weatherDays.filter((w) => Number(w.precipitation_mm ?? 0) > 1)
            .length
        : null;

      const { data: advisories } = await supabase
        .from("trip_advisories")
        .select("severity, title")
        .eq("trip_id", id)
        .is("dismissed_at", null)
        .order("generated_at", { ascending: false });

      const advisoryCounts = {
        critical: 0,
        warning: 0,
        suggestion: 0,
        info: 0,
      };
      advisories?.forEach((a) => {
        const sev = a.severity as keyof typeof advisoryCounts;
        if (advisoryCounts[sev] !== undefined) advisoryCounts[sev]++;
      });

      const topAdvisory =
        advisories?.find(
          (a) => a.severity === "critical" || a.severity === "warning",
        ) ?? advisories?.[0];

      const realTotalCost = (flightMin ?? 0) + (hotelTotal ?? 0);
      const destination = trip.destination as {
        name?: string;
        country_code?: string;
      } | null;

      return {
        trip_id: trip.id,
        name: trip.name,
        destination_name: destination?.name ?? "",
        country_code: destination?.country_code ?? "",
        date_from: trip.date_from,
        date_to: trip.date_to,
        nights,
        metrics: {
          flight_min_pln: flightMin,
          hotel_total_pln: hotelTotal,
          hotel_per_night_pln: hotelPerNight,
          real_total_cost_pln: realTotalCost > 0 ? realTotalCost : null,
          direct_flight_available: directFlight,
          weather_temp_max_avg: tempMaxAvg,
          weather_rainy_days: rainyDays,
          attractions_count: trip.selected_attraction_ids?.length ?? 0,
          advisories_count: advisoryCounts,
          top_advisory_title: topAdvisory?.title ?? null,
        },
      } satisfies TripComparison;
    }),
  );

  return trips.filter((t): t is TripComparison => t !== null);
}

async function getFlightPrice(
  supabase: AdminClient,
  offerId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("flight_offers_cache")
    .select("price_pln")
    .eq("id", offerId)
    .single();
  return data?.price_pln ?? null;
}
