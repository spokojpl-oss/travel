import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchActivities } from "@/lib/search/activity-search";
import { agentLog } from "@/lib/debug/agent-log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const searchRequestSchema = z.object({
  activities: z
    .array(z.string())
    .min(1, "Wybierz co najmniej 1 aktywność")
    .max(10),
  match_mode: z.enum(["all", "any"]).default("all"),
  max_radius_km: z.number().min(5).max(200).default(50),
  min_per_activity: z.number().int().min(1).max(10).default(1),
  near_lat: z.number().min(-90).max(90).optional(),
  near_lon: z.number().min(-180).max(180).optional(),
  near_radius_km: z.number().min(10).max(500).optional(),
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
    agentLog(
      "activities/route.ts:POST",
      "search request start",
      {
        activities: parsed.data.activities,
        match_mode: parsed.data.match_mode,
        has_near: parsed.data.near_lat != null,
        max_radius_km: parsed.data.max_radius_km,
      },
      "A",
    );
    const result = await searchActivities(parsed.data);
    agentLog(
      "activities/route.ts:POST",
      "search request done",
      {
        clusters: result.clusters.length,
        attractions: result.total_attractions_considered,
        duration_ms: result.duration_ms,
        api_ms: Date.now() - apiStart,
      },
      "A",
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 },
    );
  }
}
