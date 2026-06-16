import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
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
  const { searchParams } = new URL(request.url);
  const contextHash = searchParams.get("context");

  const { data: destination } = await supabase
    .from("destinations")
    .select("*")
    .eq("id", id)
    .single();

  if (!destination) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: attractions } = await supabase
    .from("attractions")
    .select("*, activity_tags:attraction_activity_tags(activity_slug, confidence)")
    .eq("destination_id", id)
    .limit(100);

  let summary = null;
  if (contextHash) {
    const { data: s } = await supabase
      .from("destination_summaries")
      .select("*")
      .eq("destination_id", id)
      .eq("context_hash", contextHash)
      .gt("expires_at", new Date().toISOString())
      .single();
    summary = s;
  } else {
    const { data: s } = await supabase
      .from("destination_summaries")
      .select("*")
      .eq("destination_id", id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    summary = s;
  }

  const { data: weather } = await supabase
    .from("weather_cache")
    .select("*")
    .eq("destination_id", id)
    .order("forecast_date", { ascending: true })
    .limit(30);

  const { data: climateMonthly } = await supabase
    .from("destination_climate_monthly")
    .select("*")
    .eq("destination_id", id)
    .order("month", { ascending: true });

  const { data: budgetProfile } = await supabase
    .from("destination_budget_profiles")
    .select("*")
    .eq("destination_id", id)
    .maybeSingle();

  return NextResponse.json({
    destination,
    attractions: attractions ?? [],
    summary,
    weather: weather ?? [],
    climate_monthly: climateMonthly ?? [],
    budget: budgetProfile ?? null,
  });
}
