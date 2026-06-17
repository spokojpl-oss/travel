import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCyclingRoute } from "@/lib/activities/cycling/ors-client";
import { lineStringWkt, pointWkt } from "@/lib/activities/cycling/geometry";
import type { Json } from "@/types/database";

const Body = z.object({
  destinationId: z.string().uuid(),
  startLat: z.number(),
  startLng: z.number(),
  targetDistanceKm: z.number().min(5).max(300),
  activityType: z.enum([
    "cycling_road",
    "cycling_gravel",
    "cycling_mtb",
    "cycling_ebike",
  ]),
  loop: z.boolean().default(true),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ activity: string }> },
) {
  const { activity } = await params;
  if (activity !== "cycling") {
    return NextResponse.json(
      { error: "Only cycling supported in Etap 1" },
      { status: 400 },
    );
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const route = await generateCyclingRoute(parsed.data);

    const startPointWkt = pointWkt(route.snappedLng, route.snappedLat);
    const geometryWkt = lineStringWkt(route.geometryGeoJson.coordinates);
    if (!geometryWkt) {
      return NextResponse.json(
        { error: "Wygenerowana trasa ma nieprawidłową geometrię (za mało punktów)." },
        { status: 500 },
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("activity_routes")
      .insert({
        destination_id: parsed.data.destinationId,
        category: "cycling",
        activity_type: parsed.data.activityType,
        source: "ors_generated",
        name: `Wygenerowana trasa ${Math.round(route.distance_m / 1000)} km`,
        distance_m: route.distance_m,
        elevation_gain_m: route.elevation_gain_m,
        elevation_loss_m: route.elevation_loss_m,
        surface_mix: route.surface_mix,
        is_loop: parsed.data.loop,
        start_point: startPointWkt,
        geometry: geometryWkt,
        elevation_profile: route.elevation_profile as unknown as Json,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ route: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Route generation failed" },
      { status: 500 },
    );
  }
}
