import { createClient } from "@/lib/supabase/server";
import { findTouristRegionsAsync } from "@/lib/destinations/tourist-regions-store";
import {
  defaultRhythmForTrip,
  tripRhythmFromParams,
} from "@/lib/search/trip-rhythm";
import { z } from "zod";

const bodySchema = z.object({
  destination_label: z.string().min(2),
  destination_lat: z.number().optional(),
  destination_lon: z.number().optional(),
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

  const coords =
    parsed.data.destination_lat != null && parsed.data.destination_lon != null
      ? { lat: parsed.data.destination_lat, lon: parsed.data.destination_lon }
      : null;

  const regions = await findTouristRegionsAsync({
    destinationLabel: parsed.data.destination_label,
    rhythm: rhythm as Parameters<typeof findTouristRegionsAsync>[0]["rhythm"],
    coords,
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

  const lat = url.searchParams.get("destination_lat");
  const lon = url.searchParams.get("destination_lon");
  const coords =
    lat != null && lon != null
      ? { lat: Number(lat), lon: Number(lon) }
      : null;

  const regions = await findTouristRegionsAsync({
    destinationLabel: label,
    rhythm,
    coords:
      coords != null && Number.isFinite(coords.lat) && Number.isFinite(coords.lon)
        ? coords
        : null,
  });

  return Response.json({ regions, count: regions.length });
}
