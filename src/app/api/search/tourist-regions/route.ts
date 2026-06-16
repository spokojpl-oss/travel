import { createClient } from "@/lib/supabase/server";
import { findTouristRegionsAsync } from "@/lib/destinations/tourist-regions-store";
import {
  defaultRhythmForTrip,
  tripRhythmFromParams,
} from "@/lib/search/trip-rhythm";
import { z } from "zod";

const bodySchema = z.object({
  destination_label: z.string().min(2),
  from_date: z.string(),
  to_date: z.string().optional(),
  rhythm: z
    .object({
      days: z.record(z.string(), z.number()),
      preset: z.string().nullable().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const rhythm =
    parsed.data.rhythm ??
    defaultRhythmForTrip(
      parsed.data.from_date,
      parsed.data.to_date ?? parsed.data.from_date,
    );

  const regions = await findTouristRegionsAsync({
    destinationLabel: parsed.data.destination_label,
    rhythm: rhythm as Parameters<typeof findTouristRegionsAsync>[0]["rhythm"],
  });

  return Response.json({ regions, count: regions.length });
}

/** GET z query params — alternatywa dla prostego fetch */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const label = url.searchParams.get("destination_label");
  const from = url.searchParams.get("from_date");
  if (!label || !from) {
    return Response.json({ error: "Missing params" }, { status: 400 });
  }

  const rhythm =
    tripRhythmFromParams(url.searchParams) ??
    defaultRhythmForTrip(from, url.searchParams.get("to_date") ?? from);

  const regions = await findTouristRegionsAsync({
    destinationLabel: label,
    rhythm,
  });

  return Response.json({ regions, count: regions.length });
}
