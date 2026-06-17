import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  BATCH_ROUTE_COUNT,
  DEFAULT_DESTINATION_RADIUS_KM,
  DEFAULT_REGION_RADIUS_KM,
  generateCyclingRoutesBatch,
} from "@/lib/activities/cycling/generate-batch";

const regionSchema = z.object({
  centerLat: z.number(),
  centerLng: z.number(),
  count: z.number().int().min(1).max(25),
  maxRadiusKm: z.number().min(5).max(80).optional(),
  label: z.string().optional(),
  terrain: z.enum(["coastal", "inland"]).optional(),
});

const bodySchema = z
  .object({
    destinationId: z.string().uuid(),
    regions: z.array(regionSchema).min(1).max(12).optional(),
    centerLat: z.number().optional(),
    centerLng: z.number().optional(),
    count: z.number().int().min(1).max(25).default(BATCH_ROUTE_COUNT),
    maxRadiusKm: z.number().min(5).max(80).default(DEFAULT_REGION_RADIUS_KM),
    presetStartIndex: z.number().int().min(0).max(200).default(0),
  })
  .refine(
    (data) =>
      (data.regions && data.regions.length > 0) ||
      (data.centerLat != null && data.centerLng != null),
    { message: "Podaj regions[] albo centerLat/centerLng" },
  );

export const maxDuration = 180;

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

  const regions =
    parsed.data.regions && parsed.data.regions.length > 0
      ? parsed.data.regions
      : [
          {
            centerLat: parsed.data.centerLat!,
            centerLng: parsed.data.centerLng!,
            count: parsed.data.count,
            maxRadiusKm: parsed.data.maxRadiusKm,
          },
        ];

  try {
    const result = await generateCyclingRoutesBatch({
      destinationId: parsed.data.destinationId,
      regions,
      presetStartIndex: parsed.data.presetStartIndex,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Batch generation failed" },
      { status: 500 },
    );
  }
}
