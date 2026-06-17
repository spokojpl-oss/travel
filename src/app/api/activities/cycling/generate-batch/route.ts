import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  BATCH_ROUTE_COUNT,
  DEFAULT_REGION_RADIUS_KM,
  generateCyclingRoutesBatch,
} from "@/lib/activities/cycling/generate-batch";

const bodySchema = z.object({
  destinationId: z.string().uuid(),
  centerLat: z.number(),
  centerLng: z.number(),
  count: z.number().int().min(1).max(15).default(BATCH_ROUTE_COUNT),
  maxRadiusKm: z.number().min(5).max(80).default(DEFAULT_REGION_RADIUS_KM),
});

export const maxDuration = 120;

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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await generateCyclingRoutesBatch(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Batch generation failed" },
      { status: 500 },
    );
  }
}
