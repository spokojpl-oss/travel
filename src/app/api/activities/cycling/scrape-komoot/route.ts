import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { scrapeKomootCyclingRoutesForDestination } from "@/lib/activities/cycling/scrape-komoot-routes";

const bodySchema = z.object({
  destinationId: z.string().uuid(),
  centerLat: z.number(),
  centerLng: z.number(),
  radiusKm: z.number().min(5).max(80).default(30),
  destinationLabel: z.string().optional(),
  maxTours: z.number().int().min(1).max(25).optional(),
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
    const result = await scrapeKomootCyclingRoutesForDestination(
      parsed.data.destinationId,
      {
        centerLat: parsed.data.centerLat,
        centerLon: parsed.data.centerLng,
        radiusKm: parsed.data.radiusKm,
        destinationLabel: parsed.data.destinationLabel,
        maxTours: parsed.data.maxTours,
      },
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Komoot scrape failed" },
      { status: 500 },
    );
  }
}
