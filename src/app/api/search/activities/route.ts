import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchActivities } from "@/lib/search/activity-search";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const searchRequestSchema = z.object({
  activities: z
    .array(z.string())
    .min(1, "Wybierz co najmniej 1 aktywność")
    .max(10),
  match_mode: z.enum(["all", "any"]).default("all"),
  max_radius_km: z.number().min(3).max(80).default(15),
  stay_radius_km: z.number().min(3).max(80).optional(),
  explore_radius_km: z.number().min(10).max(500).optional(),
  min_per_activity: z.number().int().min(1).max(10).default(1),
  near_lat: z.number().min(-90).max(90).optional(),
  near_lon: z.number().min(-180).max(180).optional(),
  near_radius_km: z.number().min(10).max(500).optional(),
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

  const parsed = searchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const apiStart = Date.now();
    const result = await searchActivities(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 },
    );
  }
}
