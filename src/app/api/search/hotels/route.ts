import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchHotels } from "@/lib/hotels/hotel-search";

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

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Hotel search failed" },
      { status: 500 },
    );
  }
}
