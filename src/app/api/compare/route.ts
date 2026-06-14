import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildTripComparison } from "@/lib/compare/trip-comparison";

export const dynamic = "force-dynamic";

const schema = z.object({
  trip_ids: z.array(z.string().uuid()).min(2).max(3),
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data: ownedTrips } = await supabase
    .from("trips")
    .select("id")
    .in("id", parsed.data.trip_ids)
    .eq("user_id", user.id);

  if (!ownedTrips || ownedTrips.length !== parsed.data.trip_ids.length) {
    return NextResponse.json(
      { error: "Not authorized to compare these trips" },
      { status: 403 },
    );
  }

  try {
    const comparison = await buildTripComparison(parsed.data.trip_ids);
    return NextResponse.json({ comparison });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
