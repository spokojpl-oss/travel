import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_BATCH_SPECS,
  generateCyclingRouteBatch,
} from "@/lib/activities/cycling/generate-batch";

const Body = z.object({
  destinationId: z.string().uuid(),
  startLat: z.number(),
  startLng: z.number(),
  specs: z
    .array(
      z.object({
        targetDistanceKm: z.number().min(5).max(300),
        activityType: z.enum([
          "cycling_road",
          "cycling_gravel",
          "cycling_mtb",
          "cycling_ebike",
        ]),
        loop: z.boolean().optional(),
        seed: z.number().optional(),
      }),
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await generateCyclingRouteBatch({
      destinationId: parsed.data.destinationId,
      startLat: parsed.data.startLat,
      startLng: parsed.data.startLng,
      specs: parsed.data.specs ?? DEFAULT_BATCH_SPECS,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Batch generation failed" },
      { status: 500 },
    );
  }
}
