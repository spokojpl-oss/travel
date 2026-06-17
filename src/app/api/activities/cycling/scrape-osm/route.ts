import { NextResponse } from "next/server";
import { z } from "zod";
import { scrapeOsmCyclingRoutesForDestination } from "@/lib/activities/cycling/scrape-osm-routes";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  destinationId: z.string().uuid(),
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
    const result = await scrapeOsmCyclingRoutesForDestination(parsed.data.destinationId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "OSM scrape failed" },
      { status: 500 },
    );
  }
}
