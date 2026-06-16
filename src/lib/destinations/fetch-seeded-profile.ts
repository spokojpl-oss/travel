import {
  bestMonthsForTravel,
  climateMonthForDisplay,
  MONTH_NAMES_PL,
  type MonthlyClimateNormal,
} from "@/lib/api/climate-normals";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  DestinationBudgetProfileRow,
  DestinationClimateMonthlyRow,
} from "@/types/domain";
import { resolveEuropeProfileSlug } from "@/lib/destinations/profile-slug";

export type SeededDestinationProfile = {
  slug: string;
  destination_id: string;
  destination_name: string;
  country_code: string;
  climate: {
    monthly: Array<
      DestinationClimateMonthlyRow & {
        month_name: string;
        rating_label: string;
      }
    >;
    best_months: Array<{ month: number; name: string }>;
    sample_years: number | null;
    source: string | null;
  } | null;
  budget: DestinationBudgetProfileRow | null;
};

export async function fetchSeededDestinationProfile(
  destinationLabel: string,
): Promise<SeededDestinationProfile | null> {
  const slug = resolveEuropeProfileSlug(destinationLabel);
  if (!slug) return null;

  const supabase = createAdminClient();

  const { data: destination } = await supabase
    .from("destinations")
    .select("id, name, country_code, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!destination) return null;

  const [{ data: climateMonthly }, { data: budget }] = await Promise.all([
    supabase
      .from("destination_climate_monthly")
      .select("*")
      .eq("destination_id", destination.id)
      .order("month", { ascending: true }),
    supabase
      .from("destination_budget_profiles")
      .select("*")
      .eq("destination_id", destination.id)
      .maybeSingle(),
  ]);

  const normals: MonthlyClimateNormal[] = (climateMonthly ?? []).map((row) => ({
    month: row.month,
    temp_max_avg: Number(row.temp_max_avg),
    temp_min_avg: Number(row.temp_min_avg),
    precip_mm_avg: Number(row.precip_mm_avg),
    rainy_days_avg: Number(row.rainy_days_avg),
    climate_rating: row.climate_rating,
  }));

  return {
    slug,
    destination_id: destination.id,
    destination_name: destination.name,
    country_code: destination.country_code,
    climate:
      climateMonthly && climateMonthly.length > 0
        ? {
            monthly: climateMonthly.map((row) => {
              const display = climateMonthForDisplay({
                month: row.month,
                temp_max_avg: Number(row.temp_max_avg),
                temp_min_avg: Number(row.temp_min_avg),
                precip_mm_avg: Number(row.precip_mm_avg),
                rainy_days_avg: Number(row.rainy_days_avg),
              });
              return {
                ...row,
                climate_rating: display.climate_rating,
                month_name: MONTH_NAMES_PL[display.month] ?? String(display.month),
                rating_label: display.rating_label,
              };
            }),
            best_months: bestMonthsForTravel(normals).map((m) => ({
              month: m,
              name: MONTH_NAMES_PL[m] ?? String(m),
            })),
            sample_years: climateMonthly[0]?.sample_years ?? null,
            source: climateMonthly[0]?.source ?? null,
          }
        : null,
    budget: budget ?? null,
  };
}
