import { fetchWithCache } from "@/lib/cache/api-cache";

const EUROSTAT_BASE =
  "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/PRC_HICP_MIDX";

/** Współczynnik kosztów vs Polska (2015=100), źródło: Eurostat HICP. */
export type CountryHicpSnapshot = {
  country_code: string;
  cpi_index: number;
  groceries_index: number;
  restaurant_index: number;
  period: string;
  source: "eurostat" | "world-bank";
};

type JsonStatDataset = {
  id: string[];
  size: number[];
  dimension: Record<
    string,
    {
      category: {
        index: Record<string, number>;
        label: Record<string, string>;
      };
    }
  >;
  value: Record<string, number>;
  error?: { label: string }[];
};

const COICOP = {
  all: "CP00",
  food: "CP01",
  restaurants: "CP11",
} as const;

function indexToCoordinates(
  dataset: JsonStatDataset,
  flatIndex: number,
): string[] {
  const parts: string[] = [];
  let remainder = flatIndex;

  for (let dim = 0; dim < dataset.id.length; dim++) {
    const dimKey = dataset.id[dim]!;
    const dimSize = dataset.size[dim]!;
    const position = remainder % dimSize;
    const codes = Object.keys(dataset.dimension[dimKey]!.category.index);
    parts.push(codes[position] ?? "?");
    remainder = Math.floor(remainder / dimSize);
  }

  return parts;
}

function parseLatestMonthlyIndex(
  dataset: JsonStatDataset,
  coicop: string,
): { value: number; period: string } | null {
  let best: { value: number; period: string } | null = null;

  for (const [indexKey, value] of Object.entries(dataset.value)) {
    const coords = indexToCoordinates(dataset, Number(indexKey));
    const [, , coicopCode, , period] = coords;
    if (coicopCode !== coicop || !period) continue;

    if (!best || period.localeCompare(best.period) > 0) {
      best = { value, period };
    }
  }

  return best;
}

async function fetchEurostatCoicop(
  geo: string,
  coicop: string,
  forceRefresh: boolean,
): Promise<{ value: number; period: string } | null> {
  const { data } = await fetchWithCache<JsonStatDataset>({
    source: "eurostat-hicp",
    cacheParams: { geo, coicop },
    ttlSeconds: 30 * 24 * 60 * 60,
    forceRefresh,
    fetcher: async () => {
      const params = new URLSearchParams({
        format: "JSON",
        lang: "EN",
        geo,
        coicop,
        unit: "I15",
      });
      const response = await fetch(`${EUROSTAT_BASE}?${params}`);
      if (!response.ok) {
        throw new Error(`Eurostat HICP error ${response.status} for ${geo}`);
      }
      const json = (await response.json()) as JsonStatDataset;
      if (json.error?.length) {
        throw new Error(json.error.map((e) => e.label).join("; "));
      }
      return json;
    },
  });

  return parseLatestMonthlyIndex(data, coicop);
}

export async function fetchCountryHicpFromEurostat(
  countryCode: string,
  forceRefresh = false,
): Promise<CountryHicpSnapshot | null> {
  const geo = countryCode.toUpperCase();

  const [all, food, restaurants] = await Promise.all([
    fetchEurostatCoicop(geo, COICOP.all, forceRefresh),
    fetchEurostatCoicop(geo, COICOP.food, forceRefresh),
    fetchEurostatCoicop(geo, COICOP.restaurants, forceRefresh),
  ]);

  if (!all) return null;

  return {
    country_code: geo,
    cpi_index: round1(all.value),
    groceries_index: round1(food?.value ?? all.value),
    restaurant_index: round1(restaurants?.value ?? all.value),
    period: all.period,
    source: "eurostat",
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Ładuje indeksy HICP dla wielu krajów (z cache API). */
export async function loadEuropeHicpIndexMap(
  countryCodes: string[],
  forceRefresh = false,
): Promise<Map<string, CountryHicpSnapshot>> {
  const unique = [...new Set(countryCodes.map((c) => c.toUpperCase()))];
  const map = new Map<string, CountryHicpSnapshot>();

  for (const code of unique) {
    try {
      const snapshot = await fetchCountryHicpFromEurostat(code, forceRefresh);
      if (snapshot) {
        map.set(code, snapshot);
      }
    } catch {
      // fallback w cost-of-living.ts (World Bank)
    }
  }

  return map;
}
