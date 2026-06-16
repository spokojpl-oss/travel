import { NextResponse } from "next/server";
import {
  bestMonthsForTravel,
  CLIMATE_RATING_LABELS_PL,
  MONTH_NAMES_PL,
  type MonthlyClimateNormal,
} from "@/lib/api/climate-normals";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await params;

  const { data: destination } = await supabase
    .from("destinations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!destination) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: climateMonthly } = await supabase
    .from("destination_climate_monthly")
    .select("*")
    .eq("destination_id", destination.id)
    .order("month", { ascending: true });

  const { data: budgetProfile } = await supabase
    .from("destination_budget_profiles")
    .select("*")
    .eq("destination_id", destination.id)
    .maybeSingle();

  const normals: MonthlyClimateNormal[] = (climateMonthly ?? []).map((row) => ({
    month: row.month,
    temp_max_avg: Number(row.temp_max_avg),
    temp_min_avg: Number(row.temp_min_avg),
    precip_mm_avg: Number(row.precip_mm_avg),
    rainy_days_avg: Number(row.rainy_days_avg),
    climate_rating: row.climate_rating,
  }));

  const bestMonths = bestMonthsForTravel(normals);

  return NextResponse.json({
    destination,
    climate: {
      monthly: (climateMonthly ?? []).map((row) => ({
        ...row,
        month_name: MONTH_NAMES_PL[row.month] ?? String(row.month),
        rating_label: CLIMATE_RATING_LABELS_PL[row.climate_rating],
      })),
      best_months: bestMonths.map((m) => ({
        month: m,
        name: MONTH_NAMES_PL[m] ?? String(m),
      })),
      sample_years: climateMonthly?.[0]?.sample_years ?? null,
      source: climateMonthly?.[0]?.source ?? null,
    },
    budget: budgetProfile,
  });
}
