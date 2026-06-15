import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { discoverDestination } from "@/lib/search/destination-discover";
import { explorationScopeFromString } from "@/lib/search/exploration-scope";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const discoverSchema = z.object({
  destination_label: z.string().min(2),
  near_lat: z.number().min(-90).max(90),
  near_lon: z.number().min(-180).max(180),
  from_date: z.string(),
  to_date: z.string().optional(),
  exploration_scope: z
    .enum(["local", "region", "island", "roadtrip"])
    .optional(),
  locale: z.enum(["pl", "en"]).optional(),
  passengers: z.string().optional(),
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

  const parsed = discoverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const scope =
    explorationScopeFromString(parsed.data.exploration_scope) ?? "region";
  const dateTo = parsed.data.to_date ?? parsed.data.from_date;

  try {
    const result = await discoverDestination({
      destinationLabel: parsed.data.destination_label,
      lat: parsed.data.near_lat,
      lon: parsed.data.near_lon,
      dateFrom: parsed.data.from_date,
      dateTo,
      explorationScope: scope,
      locale: parsed.data.locale ?? "pl",
      passengers: parsed.data.passengers,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Discovery failed",
      },
      { status: 500 },
    );
  }
}
