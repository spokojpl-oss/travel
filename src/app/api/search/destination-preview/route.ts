import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ensureDestinationActivities } from "@/lib/api/destination-activity-prefill";
import { countActivitiesNearPoint } from "@/lib/api/destination-osm-fill";
import {
  explorationScopeFromString,
  scopeSearchRadii,
} from "@/lib/search/exploration-scope";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const previewSchema = z.object({
  near_lat: z.number().min(-90).max(90),
  near_lon: z.number().min(-180).max(180),
  exploration_scope: z
    .enum(["local", "region", "island", "roadtrip"])
    .optional(),
  destination_label: z.string().optional(),
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

  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const scope =
    explorationScopeFromString(parsed.data.exploration_scope) ?? "region";
  const { explore_radius_km } = scopeSearchRadii(scope);

  try {
    await ensureDestinationActivities({
      lat: parsed.data.near_lat,
      lon: parsed.data.near_lon,
      radiusKm: explore_radius_km,
      destinationLabel: parsed.data.destination_label,
    });

    const counts = await countActivitiesNearPoint({
      lat: parsed.data.near_lat,
      lon: parsed.data.near_lon,
      radiusKm: explore_radius_km,
      destinationLabel: parsed.data.destination_label,
    });

    return NextResponse.json({
      activity_counts: counts,
      exploration_scope: scope,
      radius_km: explore_radius_km,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Preview failed",
        activity_counts: {},
      },
      { status: 500 },
    );
  }
}
