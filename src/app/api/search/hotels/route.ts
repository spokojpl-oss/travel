import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchHotels } from "@/lib/hotels/hotel-search";
import { logSearch } from "@/lib/history/log-search";
import {
  calculateProximity,
  computeAttractionsCentroid,
} from "@/lib/hotels/proximity";

const schema = z.object({
  destination_id: z.string().uuid(),
  selected_attraction_ids: z
    .array(z.string().uuid())
    .min(1, "Wybierz min 1 atrakcję"),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(20),
  children_ages: z.array(z.number().int().min(0).max(17)).default([]),
  has_rental_car: z.boolean().default(false),
  property_type_filter: z
    .enum(["all", "hotel", "apartment", "villa"])
    .default("all"),
  min_stars: z.number().int().min(1).max(5).optional(),
  max_price_total: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(50).default(20),
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
  const { data: destination } = await admin
    .from("destinations")
    .select("*")
    .eq("id", parsed.data.destination_id)
    .single();

  if (!destination) {
    return NextResponse.json({ error: "Destination not found" }, { status: 404 });
  }

  const { data: attractions } = await admin
    .from("attractions")
    .select("id, name, lat, lon")
    .in("id", parsed.data.selected_attraction_ids);

  if (!attractions || attractions.length === 0) {
    return NextResponse.json({ error: "Attractions not found" }, { status: 404 });
  }

  try {
    const result = await searchHotels({
      destination,
      selectedAttractions: attractions.map((a) => ({
        id: a.id,
        name: a.name,
        lat: Number(a.lat),
        lon: Number(a.lon),
      })),
      checkIn: parsed.data.check_in,
      checkOut: parsed.data.check_out,
      group: {
        adults: parsed.data.adults,
        children_ages: parsed.data.children_ages,
        total: parsed.data.adults + parsed.data.children_ages.length,
      },
      hasRentalCar: parsed.data.has_rental_car,
      propertyTypeFilter: parsed.data.property_type_filter,
      minStars: parsed.data.min_stars,
      maxPriceTotal: parsed.data.max_price_total,
      limit: parsed.data.limit,
    });

    logSearch({
      userId: user.id,
      searchType: "hotels",
      params: parsed.data,
      resultSummary: {
        hotels_count: result.hotels.length,
        total_found: result.meta.total_found,
      },
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (error) {
    const nights = Math.max(
      1,
      Math.round(
        (new Date(parsed.data.check_out).getTime() -
          new Date(parsed.data.check_in).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const { data: cachedOffers } = await admin
      .from("hotel_offers_cache")
      .select("*, hotel:hotels (*)")
      .eq("check_in", parsed.data.check_in)
      .eq("check_out", parsed.data.check_out)
      .order("price_total_pln", { ascending: true })
      .limit(20);

    const destinationOffers = (cachedOffers ?? []).filter(
      (o) =>
        o.hotel &&
        (o.hotel as { destination_id: string | null }).destination_id ===
          destination.id,
    );

    if (destinationOffers.length > 0) {
      const attractionPoints = attractions.map((a) => ({
        id: a.id,
        name: a.name,
        lat: Number(a.lat),
        lon: Number(a.lon),
      }));
      const proximityMap = calculateProximity({
        hotels: destinationOffers.map((o) => ({
          id: (o.hotel as { id: string }).id,
          lat: Number((o.hotel as { lat: number }).lat),
          lon: Number((o.hotel as { lon: number }).lon),
        })),
        attractions: attractionPoints,
      });

      const hotels = destinationOffers.map((o) => {
        const hotel = o.hotel as {
          id: string;
          name: string;
          lat: number;
          lon: number;
          stars: number | null;
          address: string | null;
          property_type: string | null;
        };
        const proximity = proximityMap.get(hotel.id);
        return {
          hotel: {
            id: hotel.id,
            name: hotel.name,
            lat: Number(hotel.lat),
            lon: Number(hotel.lon),
            stars: hotel.stars,
            address: hotel.address,
            property_type: hotel.property_type,
          },
          offer: {
            price_total_pln: o.price_total_pln,
            price_per_night_pln: o.price_per_night_pln,
            nights: o.nights,
            deep_link: o.deep_link,
          },
          proximity: {
            avg_distance_km: proximity?.avg_distance_km ?? 0,
            closest: proximity?.closest_attraction ?? {
              name: "-",
              distance_km: 0,
            },
            farthest: proximity?.farthest_attraction ?? {
              name: "-",
              distance_km: 0,
            },
          },
          real_cost: {
            total_pln: o.price_total_pln,
            per_person_per_night_pln: Math.round(
              o.price_total_pln /
                nights /
                (parsed.data.adults + parsed.data.children_ages.length),
            ),
            notes: ["Dane z cache – koszt szacunkowy"],
          },
          score: 0.5,
        };
      });

      logSearch({
        userId: user.id,
        searchType: "hotels",
        params: parsed.data,
        resultSummary: { hotels_count: hotels.length, fallback: true },
      }).catch(() => {});

      return NextResponse.json({
        hotels,
        property_type_recommendation: {
          recommended_type: "either",
          confidence: "low",
          reasoning: "Dane z cache – brak pełnej analizy typu noclegu.",
          metrics: {
            hours_per_day_outside: 0,
            pct_day_outside: 0,
            nights,
            group_size:
              parsed.data.adults + parsed.data.children_ages.length,
          },
        },
        meta: {
          destination_name: destination.name,
          centroid: computeAttractionsCentroid(attractionPoints),
          total_found: destinationOffers.length,
          after_filter: hotels.length,
          used_location_name: "cache",
          warning:
            "API niedostępne, pokazuję ostatnie znane ceny. Dane mogą być nieaktualne.",
          fallback_used: true,
          oldest_fetched_at:
            destinationOffers[destinationOffers.length - 1]?.fetched_at,
        },
      });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Hotel search failed",
        fallback_used: false,
      },
      { status: 503 },
    );
  }
}
