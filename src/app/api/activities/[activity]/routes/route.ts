import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isActivityCategory, parseRouteStartPoint } from "@/lib/supabase/activity-routes";
import { maxDistanceFromPointM } from "@/lib/activities/cycling/route-validation";

const QuerySchema = z.object({
  destinationId: z.string().uuid(),
  activityType: z
    .enum([
      "cycling_road",
      "cycling_gravel",
      "cycling_mtb",
      "cycling_ebike",
      "cycling_touring",
    ])
    .optional(),
  minDistanceM: z.coerce.number().int().min(0).optional(),
  maxDistanceM: z.coerce.number().int().min(0).optional(),
  maxElevationGain: z.coerce.number().int().min(0).optional(),
  difficulty: z
    .array(z.enum(["easy", "moderate", "hard", "expert"]))
    .optional(),
  nearLat: z.coerce.number().optional(),
  nearLng: z.coerce.number().optional(),
  nearRadiusKm: z.coerce.number().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ activity: string }> },
) {
  const { activity } = await params;
  if (!isActivityCategory(activity)) {
    return NextResponse.json({ error: "Unknown activity" }, { status: 400 });
  }

  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams);
  const difficulty = url.searchParams.getAll("difficulty");
  const parsed = QuerySchema.safeParse({
    ...raw,
    difficulty: difficulty.length > 0 ? difficulty : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const q = parsed.data;

  const supabase = await createClient();
  const fetchLimit =
    q.nearLat != null && q.nearLng != null && q.nearRadiusKm != null
      ? Math.min(50, q.limit * 3)
      : q.limit;

  let query = supabase
    .from("activity_routes")
    .select("*")
    .eq("destination_id", q.destinationId)
    .eq("category", activity)
    .order("popularity_score", { ascending: false })
    .limit(fetchLimit);

  if (q.activityType) query = query.eq("activity_type", q.activityType);
  if (q.minDistanceM != null) query = query.gte("distance_m", q.minDistanceM);
  if (q.maxDistanceM != null) query = query.lte("distance_m", q.maxDistanceM);
  if (q.maxElevationGain != null) {
    query = query.lte("elevation_gain_m", q.maxElevationGain);
  }
  if (q.difficulty?.length) query = query.in("difficulty", q.difficulty);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let routes = data ?? [];
  if (
    q.nearLat != null &&
    q.nearLng != null &&
    q.nearRadiusKm != null &&
    routes.length > 0
  ) {
    const radiusM = q.nearRadiusKm * 1000;
    routes = routes.filter((row) => {
      const start = parseRouteStartPoint(row.start_point);
      if (!start) return true;
      const dist = maxDistanceFromPointM(
        [[start.lng, start.lat]],
        q.nearLat!,
        q.nearLng!,
      );
      return dist <= radiusM;
    });
  }

  return NextResponse.json({ routes: routes.slice(0, q.limit) });
}
