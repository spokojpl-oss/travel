import { findOrCreateDestination } from "@/lib/api/destinations";
import {
  CLIMATE_SAMPLE_END_YEAR,
  CLIMATE_SAMPLE_START_YEAR,
  fetchMonthlyClimateNormals,
} from "@/lib/api/climate-normals";
import {
  buildDestinationBudgetProfile,
  isFreeBudgetSourceAvailable,
  prepareEuropeBudgetContext,
} from "@/lib/api/cost-of-living";
import {
  getEuropeDestinationProfiles,
  type EuropeDestinationProfile,
} from "@/lib/destinations/europe-profiles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import type { DestinationType } from "@/types/domain";
import type { CountryHicpSnapshot } from "@/lib/api/eurostat-hicp";

export type SeedEuropeOptions = {
  slugs?: string[];
  skipBudget?: boolean;
  skipClimate?: boolean;
  forceRefresh?: boolean;
  delayMs?: number;
};

export type SeedEuropeResult = {
  profiles_total: number;
  destinations_created: number;
  climate_rows: number;
  budget_rows: number;
  errors: { slug: string; step: string; message: string }[];
};

function mapKindToDestinationType(kind: EuropeDestinationProfile["kind"]): DestinationType {
  switch (kind) {
    case "country":
      return "country";
    case "island":
      return "island";
    case "region":
      return "region";
    default:
      return "city";
  }
}

async function upsertClimateMonthly(
  destinationId: string,
  profile: EuropeDestinationProfile,
  forceRefresh: boolean,
): Promise<number> {
  const normals = await fetchMonthlyClimateNormals({
    location: { lat: profile.lat, lon: profile.lon },
    forceRefresh,
  });

  const supabase = createAdminClient();
  const sampleYears = CLIMATE_SAMPLE_END_YEAR - CLIMATE_SAMPLE_START_YEAR + 1;

  const rows = normals.map((n) => ({
    destination_id: destinationId,
    month: n.month,
    temp_max_avg: n.temp_max_avg,
    temp_min_avg: n.temp_min_avg,
    precip_mm_avg: n.precip_mm_avg,
    rainy_days_avg: n.rainy_days_avg,
    climate_rating: n.climate_rating,
    source: "open-meteo-archive",
    sample_years: sampleYears,
    fetched_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("destination_climate_monthly")
    .upsert(rows, { onConflict: "destination_id,month" });

  if (error) {
    throw new Error(`climate upsert: ${error.message}`);
  }

  return rows.length;
}

async function upsertBudgetProfile(
  destinationId: string,
  profile: EuropeDestinationProfile,
  budgetContext: {
    eurostatMap: Map<string, CountryHicpSnapshot>;
    reference: CountryHicpSnapshot;
  },
  forceRefresh: boolean,
): Promise<number> {
  const budget = await buildDestinationBudgetProfile({
    profile,
    eurostatMap: budgetContext.eurostatMap,
    reference: budgetContext.reference,
    forceRefresh,
  });

  const supabase = createAdminClient();
  const { error } = await supabase.from("destination_budget_profiles").upsert(
    {
      destination_id: destinationId,
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
      sample_prices: budget.sample_prices as Json,
      source: budget.source,
      numbeo_city_id: budget.numbeo_city_id,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "destination_id,currency" },
  );

  if (error) {
    throw new Error(`budget upsert: ${error.message}`);
  }

  return 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function seedEuropeDestinationProfiles(
  options: SeedEuropeOptions = {},
): Promise<SeedEuropeResult> {
  const {
    slugs,
    skipBudget = false,
    skipClimate = false,
    forceRefresh = false,
    delayMs = 800,
  } = options;

  let profiles = getEuropeDestinationProfiles();
  if (slugs?.length) {
    const slugSet = new Set(slugs.map((s) => s.toLowerCase()));
    profiles = profiles.filter((p) => slugSet.has(p.slug));
  }

  const result: SeedEuropeResult = {
    profiles_total: profiles.length,
    destinations_created: 0,
    climate_rows: 0,
    budget_rows: 0,
    errors: [],
  };

  const budgetEnabled = !skipBudget && isFreeBudgetSourceAvailable();

  let budgetContext: {
    eurostatMap: Map<string, CountryHicpSnapshot>;
    reference: CountryHicpSnapshot;
  } | null = null;

  if (budgetEnabled) {
    console.log(
      "Ładowanie indeksów kosztów życia (Eurostat HICP + World Bank — bez Numbeo)...",
    );
    try {
      budgetContext = await prepareEuropeBudgetContext(
        profiles.map((p) => p.countryCode),
        forceRefresh,
      );
    } catch (error) {
      console.warn(
        "Budżet pominięty:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  for (const profile of profiles) {
    try {
      const existingBefore = await createAdminClient()
        .from("destinations")
        .select("id")
        .eq("slug", profile.slug)
        .maybeSingle();

      const destination = await findOrCreateDestination({
        slug: profile.slug,
        name: profile.name,
        countryCode: profile.countryCode,
        type: mapKindToDestinationType(profile.kind),
        centerLat: profile.lat,
        centerLon: profile.lon,
        boundingBox: profile.boundingBox ?? {
          north: profile.lat + 0.5,
          south: profile.lat - 0.5,
          east: profile.lon + 0.5,
          west: profile.lon - 0.5,
        },
        timezone: "UTC",
        description: `${profile.name}, ${profile.country}`,
      });

      if (!existingBefore.data) {
        result.destinations_created += 1;
      }

      if (!skipClimate) {
        result.climate_rows += await upsertClimateMonthly(
          destination.id,
          profile,
          forceRefresh,
        );
        await sleep(delayMs);
      }

      if (budgetContext) {
        try {
          result.budget_rows += await upsertBudgetProfile(
            destination.id,
            profile,
            budgetContext,
            forceRefresh,
          );
        } catch (error) {
          result.errors.push({
            slug: profile.slug,
            step: "budget",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      console.log(
        `✓ ${profile.name} (${profile.country}) — klimat${budgetContext ? " + budżet" : ""}`,
      );
    } catch (error) {
      result.errors.push({
        slug: profile.slug,
        step: "profile",
        message: error instanceof Error ? error.message : String(error),
      });
      console.error(
        `✗ ${profile.slug}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return result;
}
