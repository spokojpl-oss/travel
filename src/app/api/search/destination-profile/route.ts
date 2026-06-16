import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchSeededDestinationProfile } from "@/lib/destinations/fetch-seeded-profile";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const label = new URL(request.url).searchParams.get("label")?.trim();
  if (!label || label.length < 2) {
    return NextResponse.json({ error: "Missing label" }, { status: 400 });
  }

  try {
    const profile = await fetchSeededDestinationProfile(label);
    if (!profile) {
      return NextResponse.json({ profile: null, seeded: false });
    }

    return NextResponse.json({ profile, seeded: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Profile fetch failed",
      },
      { status: 500 },
    );
  }
}
