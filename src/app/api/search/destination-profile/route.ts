import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildDestinationProfile } from "@/lib/destinations/destination-profile";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const label = searchParams.get("label")?.trim();
  const latParam = searchParams.get("lat");
  const lonParam = searchParams.get("lon");

  if (!label || label.length < 2) {
    return NextResponse.json({ error: "Missing label" }, { status: 400 });
  }

  const lat = latParam != null ? Number(latParam) : undefined;
  const lon = lonParam != null ? Number(lonParam) : undefined;

  try {
    const profile = await buildDestinationProfile({
      destinationLabel: label,
      lat: Number.isFinite(lat) ? lat : undefined,
      lon: Number.isFinite(lon) ? lon : undefined,
    });

    return NextResponse.json({
      profile,
      has_climate: Boolean(profile.climate?.monthly.length),
      has_budget: Boolean(profile.budget),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Profile fetch failed",
      },
      { status: 500 },
    );
  }
}
