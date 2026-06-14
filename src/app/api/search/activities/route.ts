import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchActivities } from "@/lib/search/activity-search";

export const dynamic = "force-dynamic";

const searchRequestSchema = z.object({
  activities: z
    .array(z.string())
    .min(1, "Wybierz co najmniej 1 aktywność")
    .max(10),
  match_mode: z.enum(["all", "any"]).default("all"),
  max_radius_km: z.number().min(5).max(200).default(50),
  min_per_activity: z.number().int().min(1).max(10).default(1),
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
    const result = await searchActivities(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 },
    );
  }
}
