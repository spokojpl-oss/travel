import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrFindDestinationAirports } from "@/lib/flights/airport-finder";
import type { BoundingBox } from "@/types/domain";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: destination } = await admin
    .from("destinations")
    .select("*")
    .eq("id", id)
    .single();

  if (!destination) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const airports = await getOrFindDestinationAirports({
    destinationId: destination.id,
    center: {
      lat: Number(destination.center_lat),
      lon: Number(destination.center_lon),
    },
    bbox: destination.bounding_box as BoundingBox,
  });

  return NextResponse.json({ airports });
}
