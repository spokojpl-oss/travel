import {
  bestMonthsForTravel,
  CLIMATE_SAMPLE_END_YEAR,
  CLIMATE_SAMPLE_START_YEAR,
  climateMonthForDisplay,
  fetchMonthlyClimateNormals,
  MONTH_NAMES_PL,
  type MonthlyClimateNormal,
} from "@/lib/api/climate-normals";
import {
  buildDestinationBudgetProfile,
  prepareEuropeBudgetContext,
} from "@/lib/api/cost-of-living";
import { DESTINATION_CATALOG } from "@/lib/destinations/catalog";
import {
  getEuropeDestinationProfiles,
  type EuropeDestinationProfile,
} from "@/lib/destinations/europe-profiles";
import { resolveEuropeProfileSlug } from "@/lib/destinations/profile-slug";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  DestinationBudgetProfileRow,
  DestinationClimateMonthlyRow,
} from "@/types/domain";

export type DestinationProfileClimate = {
  monthly: Array<
    Pick<
      DestinationClimateMonthlyRow,
      | "month"
      | "temp_max_avg"
      | "temp_min_avg"
      | "precip_mm_avg"
      | "rainy_days_avg"
      | "climate_rating"
    > & {
      month_name: string;
      rating_label: string;
    }
  >;
  best_months: Array<{ month: number; name: string }>;
  sample_years: number | null;
  source: string | null;
};

export type DestinationProfileResponse = {
  slug: string | null;
  destination_name: string;
  country_code: string | null;
  climate: DestinationProfileClimate | null;
  budget: DestinationBudgetProfileRow | null;
  /** seed = Supabase, live = Open-Meteo / Eurostat w locie */
  climate_source: "seed" | "live" | null;
  budget_source: "seed" | "live" | null;
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolveEuropeProfile(
  destinationLabel: string,
): EuropeDestinationProfile | null {
  const slug = resolveEuropeProfileSlug(destinationLabel);
  if (slug) {
    return getEuropeDestinationProfiles().find((p) => p.slug === slug) ?? null;
  }
  return null;
}

function resolveCatalogCoords(
  destinationLabel: string,
): { lat: number; lon: number; name: string; countryCode: string } | null {
  const n = normalize(destinationLabel);
  for (const entry of DESTINATION_CATALOG) {
    const name = normalize(entry.name);
    const country = normalize(entry.country);
    if (!entry.lat || !entry.lon) continue;
    if (n.includes(name) || (entry.aliases ?? []).some((a) => n.includes(normalize(a)))) {
      return {
        lat: entry.lat,
        lon: entry.lon,
        name: entry.name,
        countryCode:
          getEuropeDestinationProfiles().find((p) => p.name === entry.name)
            ?.countryCode ?? "XX",
      };
    }
    if (n.includes(country) && n.includes(name.split(" ")[0] ?? "")) {
      return {
        lat: entry.lat,
        lon: entry.lon,
        name: entry.name,
        countryCode: "XX",
      };
    }
  }
  return null;
}

function climateFromNormals(
  normals: MonthlyClimateNormal[],
  source: string,
): DestinationProfileClimate {
  return {
    monthly: normals.map((row) => {
      const display = climateMonthForDisplay(row);
      return {
        month: display.month,
        temp_max_avg: display.temp_max_avg,
        temp_min_avg: display.temp_min_avg,
        precip_mm_avg: display.precip_mm_avg,
        rainy_days_avg: display.rainy_days_avg,
        climate_rating: display.climate_rating,
        month_name: MONTH_NAMES_PL[display.month] ?? String(display.month),
        rating_label: display.rating_label,
      };
    }),
    best_months: bestMonthsForTravel(normals).map((m) => ({
      month: m,
      name: MONTH_NAMES_PL[m] ?? String(m),
    })),
    sample_years: CLIMATE_SAMPLE_END_YEAR - CLIMATE_SAMPLE_START_YEAR + 1,
    source,
  };
}

async function fetchSeededClimateAndBudget(slug: string): Promise<{
  climate: DestinationProfileClimate | null;
  budget: DestinationBudgetProfileRow | null;
}> {
  const supabase = createAdminClient();

  const { data: destination } = await supabase
    .from("destinations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!destination) {
    return { climate: null, budget: null };
  }

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

  if (!climateMonthly?.length) {
    return { climate: null, budget: budget ?? null };
  }

  const normals: MonthlyClimateNormal[] = climateMonthly.map((row) => ({
    month: row.month,
    temp_max_avg: Number(row.temp_max_avg),
    temp_min_avg: Number(row.temp_min_avg),
    precip_mm_avg: Number(row.precip_mm_avg),
    rainy_days_avg: Number(row.rainy_days_avg),
    climate_rating: row.climate_rating,
  }));

  return {
    climate: {
      monthly: climateMonthly.map((row) => {
        const display = climateMonthForDisplay({
          month: row.month,
          temp_max_avg: Number(row.temp_max_avg),
          temp_min_avg: Number(row.temp_min_avg),
          precip_mm_avg: Number(row.precip_mm_avg),
          rainy_days_avg: Number(row.rainy_days_avg),
        });
        return {
          month: display.month,
          temp_max_avg: display.temp_max_avg,
          temp_min_avg: display.temp_min_avg,
          precip_mm_avg: display.precip_mm_avg,
          rainy_days_avg: display.rainy_days_avg,
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
    },
    budget: budget ?? null,
  };
}

function budgetRowFromProfile(
  budget: Awaited<ReturnType<typeof buildDestinationBudgetProfile>>,
): DestinationBudgetProfileRow {
  return {
    id: "live",
    destination_id: "live",
    currency: budget.currency,
    reference_location: budget.reference_location,
    cpi_index: budget.cpi_index,
    cpi_vs_reference_pct: budget.cpi_vs_reference_pct,
    restaurant_index: budget.restaurant_index,
    groceries_index: budget.groceries_index,
    rent_index: budget.rent_index,
    daily_budget_low: budget.daily_budget_low,
    daily_budget_mid: budget.daily_budget_mid,
    daily_budget_high: budget.daily_budget_high,
    sample_prices: budget.sample_prices,
    source: budget.source,
    numbeo_city_id: budget.numbeo_city_id,
    fetched_at: new Date().toISOString(),
  };
}

export async function buildDestinationProfile({
  destinationLabel,
  lat,
  lon,
}: {
  destinationLabel: string;
  lat?: number;
  lon?: number;
}): Promise<DestinationProfileResponse> {
  const europeProfile = resolveEuropeProfile(destinationLabel);
  const catalogHit = resolveCatalogCoords(destinationLabel);

  const resolvedLat = lat ?? europeProfile?.lat ?? catalogHit?.lat;
  const resolvedLon = lon ?? europeProfile?.lon ?? catalogHit?.lon;
  const name =
    europeProfile?.name ?? catalogHit?.name ?? destinationLabel.split(",")[0]?.trim() ?? destinationLabel;
  const countryCode =
    europeProfile?.countryCode ?? catalogHit?.countryCode ?? null;
  const slug = europeProfile?.slug ?? resolveEuropeProfileSlug(destinationLabel);

  let climate: DestinationProfileClimate | null = null;
  let budget: DestinationBudgetProfileRow | null = null;
  let climate_source: DestinationProfileResponse["climate_source"] = null;
  let budget_source: DestinationProfileResponse["budget_source"] = null;

  if (slug) {
    const seeded = await fetchSeededClimateAndBudget(slug);
    if (seeded.climate) {
      climate = seeded.climate;
      climate_source = "seed";
    }
    if (seeded.budget) {
      budget = seeded.budget;
      budget_source = "seed";
    }
  }

  if (!climate && resolvedLat != null && resolvedLon != null) {
    try {
      const normals = await fetchMonthlyClimateNormals({
        location: { lat: resolvedLat, lon: resolvedLon },
      });
      climate = climateFromNormals(normals, "open-meteo-archive-live");
      climate_source = "live";
    } catch {
      /* brak klimatu */
    }
  }

  if (!budget && europeProfile) {
    try {
      const ctx = await prepareEuropeBudgetContext([europeProfile.countryCode]);
      const liveBudget = await buildDestinationBudgetProfile({
        profile: europeProfile,
        eurostatMap: ctx.eurostatMap,
        reference: ctx.reference,
      });
      budget = budgetRowFromProfile(liveBudget);
      budget_source = "live";
    } catch {
      /* brak budżetu */
    }
  }

  return {
    slug,
    destination_name: name,
    country_code: countryCode,
    climate,
    budget,
    climate_source,
    budget_source,
  };
}
