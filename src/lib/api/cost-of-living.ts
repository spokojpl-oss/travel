import type { CountryHicpSnapshot } from "@/lib/api/eurostat-hicp";
import { loadEuropeHicpIndexMap } from "@/lib/api/eurostat-hicp";
import { resolveCountryHicpSnapshot } from "@/lib/api/world-bank-cpi";
import type { EuropeDestinationProfile } from "@/lib/destinations/europe-profiles";

export type TravelBudgetTiers = {
  daily_low: number;
  daily_mid: number;
  daily_high: number;
  currency: string;
};

export type DestinationBudgetProfile = {
  currency: string;
  reference_location: string;
  cpi_index: number | null;
  cpi_vs_reference_pct: number | null;
  restaurant_index: number | null;
  groceries_index: number | null;
  rent_index: number | null;
  daily_budget_low: number | null;
  daily_budget_mid: number | null;
  daily_budget_high: number | null;
  sample_prices: Record<string, number>;
  numbeo_city_id: number | null;
  source: string;
};

/** Bazowy dzienny budżet turysty w Polsce (PLN/os., bez lotu). */
const POLAND_DAILY_BASE = {
  low: 150,
  mid: 320,
  high: 550,
};

/** Przykładowe ceny w Polsce (PLN) — skalowane względem indeksu HICP. */
const POLAND_SAMPLE_PRICES: Record<string, number> = {
  meal_inexpensive: 35,
  meal_mid_2: 180,
  mcmeal: 32,
  beer_local: 15,
  cappuccino: 14,
  water_bottle: 4,
  hotel_2star: 220,
  hotel_3star: 380,
  hotel_4star: 650,
  transport_ticket: 4.5,
  taxi_start: 9,
  car_rental: 130,
  cinema: 30,
};

/** Droższe miejsca turystyczne w Europie (mnożnik kosztów lokalnych). */
const CITY_COST_MULTIPLIER: Record<string, number> = {
  "santorini-grecja": 1.35,
  "mykonos-grecja": 1.4,
  "dubrownik-chorwacja": 1.25,
  "wenecja-wlochy": 1.3,
  "paryz-francja": 1.2,
  "zurych-szwajcaria": 1.45,
  "londyn-wielka-brytania": 1.25,
  "malta-malta": 1.15,
  "islandia-islandia": 1.55,
  "oslo-norwegia": 1.5,
  "bergen-norwegia": 1.45,
};

const REFERENCE_COUNTRY = "PL";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function cityCostMultiplier(profile: EuropeDestinationProfile): number {
  if (CITY_COST_MULTIPLIER[profile.slug]) {
    return CITY_COST_MULTIPLIER[profile.slug]!;
  }
  if (profile.kind === "island") return 1.12;
  return 1.0;
}

function scaleSamplePrices(
  multiplier: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, base] of Object.entries(POLAND_SAMPLE_PRICES)) {
    out[key] = round2(base * multiplier);
  }
  return out;
}

function estimateDailyTiers(
  countryMultiplier: number,
  cityMultiplier: number,
): TravelBudgetTiers {
  const m = countryMultiplier * cityMultiplier;
  return {
    daily_low: round2(POLAND_DAILY_BASE.low * m),
    daily_mid: round2(POLAND_DAILY_BASE.mid * m),
    daily_high: round2(POLAND_DAILY_BASE.high * m),
    currency: "PLN",
  };
}

export function buildBudgetProfileFromHicp({
  profile,
  countrySnapshot,
  referenceSnapshot,
}: {
  profile: EuropeDestinationProfile;
  countrySnapshot: CountryHicpSnapshot;
  referenceSnapshot: CountryHicpSnapshot;
}): DestinationBudgetProfile {
  const cityMul = cityCostMultiplier(profile);
  const countryMul =
    referenceSnapshot.cpi_index > 0
      ? countrySnapshot.cpi_index / referenceSnapshot.cpi_index
      : 1;
  const totalMul = countryMul * cityMul;

  const cpiVsRef =
    referenceSnapshot.cpi_index > 0
      ? round2((countryMul - 1) * 100)
      : null;

  const tiers = estimateDailyTiers(countryMul, cityMul);
  const samplePrices = scaleSamplePrices(totalMul);

  const groceriesMul =
    referenceSnapshot.groceries_index > 0
      ? countrySnapshot.groceries_index / referenceSnapshot.groceries_index
      : countryMul;
  const restaurantMul =
    referenceSnapshot.restaurant_index > 0
      ? countrySnapshot.restaurant_index / referenceSnapshot.restaurant_index
      : countryMul;

  return {
    currency: "PLN",
    reference_location: "Polska (Eurostat HICP / World Bank CPI)",
    cpi_index: countrySnapshot.cpi_index,
    cpi_vs_reference_pct: cpiVsRef,
    restaurant_index: round2(restaurantMul * 100),
    groceries_index: round2(groceriesMul * 100),
    rent_index: null,
    daily_budget_low: tiers.daily_low,
    daily_budget_mid: tiers.daily_mid,
    daily_budget_high: tiers.daily_high,
    sample_prices: samplePrices,
    numbeo_city_id: null,
    source: `${countrySnapshot.source === "eurostat" ? "eurostat-hicp" : "world-bank-cpi"}:${countrySnapshot.period}`,
  };
}

let cachedReference: CountryHicpSnapshot | null = null;
let cachedEurostatMap: Map<string, CountryHicpSnapshot> | null = null;

export async function prepareEuropeBudgetContext(
  countryCodes: string[],
  forceRefresh = false,
): Promise<{
  eurostatMap: Map<string, CountryHicpSnapshot>;
  reference: CountryHicpSnapshot;
}> {
  if (!forceRefresh && cachedEurostatMap && cachedReference) {
    return { eurostatMap: cachedEurostatMap, reference: cachedReference };
  }

  const eurostatMap = await loadEuropeHicpIndexMap(countryCodes, forceRefresh);

  let reference =
    eurostatMap.get(REFERENCE_COUNTRY) ??
    (await resolveCountryHicpSnapshot(
      REFERENCE_COUNTRY,
      eurostatMap,
      forceRefresh,
    ));

  if (!reference) {
    throw new Error(
      "Nie udało się pobrać indeksu referencyjnego dla Polski (Eurostat/World Bank).",
    );
  }

  cachedEurostatMap = eurostatMap;
  cachedReference = reference;

  return { eurostatMap, reference };
}

export async function buildDestinationBudgetProfile({
  profile,
  eurostatMap,
  reference,
  forceRefresh = false,
}: {
  profile: EuropeDestinationProfile;
  eurostatMap: Map<string, CountryHicpSnapshot>;
  reference: CountryHicpSnapshot;
  forceRefresh?: boolean;
}): Promise<DestinationBudgetProfile> {
  const countrySnapshot = await resolveCountryHicpSnapshot(
    profile.countryCode,
    eurostatMap,
    forceRefresh,
  );

  if (!countrySnapshot) {
    throw new Error(`Brak danych CPI/HICP dla ${profile.countryCode}`);
  }

  return buildBudgetProfileFromHicp({
    profile,
    countrySnapshot,
    referenceSnapshot: reference,
  });
}

/** @deprecated Numbeo wymaga płatnego API (~260 USD/m). Używaj buildDestinationBudgetProfile. */
export function isNumbeoConfigured(): boolean {
  return Boolean(process.env.NUMBEO_API_KEY?.trim());
}

export function isFreeBudgetSourceAvailable(): boolean {
  return true;
}
