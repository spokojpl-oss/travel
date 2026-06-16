import { fetchWithCache } from "@/lib/cache/api-cache";
import type { CountryHicpSnapshot } from "@/lib/api/eurostat-hicp";

const WORLD_BANK_CPI = "FP.CPI.TOTL";

type WorldBankRow = {
  countryiso3code: string;
  date: string;
  value: number | null;
};

type WorldBankResponse = [unknown, WorldBankRow[] | null];

/** ISO2 → ISO3 dla europejskich krajów używanych w profilach. */
const ISO3: Record<string, string> = {
  AL: "ALB",
  AT: "AUT",
  BA: "BIH",
  BE: "BEL",
  BG: "BGR",
  CH: "CHE",
  CY: "CYP",
  CZ: "CZE",
  DE: "DEU",
  DK: "DNK",
  EE: "EST",
  ES: "ESP",
  FI: "FIN",
  FR: "FRA",
  GB: "GBR",
  GR: "GRC",
  HR: "HRV",
  HU: "HUN",
  IE: "IRL",
  IS: "ISL",
  IT: "ITA",
  LT: "LTU",
  LU: "LUX",
  LV: "LVA",
  ME: "MNE",
  MK: "MKD",
  MT: "MLT",
  NL: "NLD",
  NO: "NOR",
  PL: "POL",
  PT: "PRT",
  RO: "ROU",
  RS: "SRB",
  SE: "SWE",
  SI: "SVN",
  SK: "SVK",
  TR: "TUR",
  UA: "UKR",
};

export function countryCodeToIso3(countryCode: string): string | null {
  return ISO3[countryCode.toUpperCase()] ?? null;
}

export async function fetchCountryCpiFromWorldBank(
  countryCode: string,
  forceRefresh = false,
): Promise<CountryHicpSnapshot | null> {
  const iso3 = countryCodeToIso3(countryCode);
  if (!iso3) return null;

  const { data } = await fetchWithCache<WorldBankRow[]>({
    source: "world-bank-cpi",
    cacheParams: { iso3 },
    ttlSeconds: 30 * 24 * 60 * 60,
    forceRefresh,
    fetcher: async () => {
      const url =
        `https://api.worldbank.org/v2/country/${iso3}/indicator/${WORLD_BANK_CPI}` +
        `?format=json&date=2018:2024&per_page=20`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`World Bank CPI error ${response.status}`);
      }
      const json = (await response.json()) as WorldBankResponse;
      return json[1] ?? [];
    },
  });

  const rows = data
    .filter((r) => r.value != null)
    .sort((a, b) => b.date.localeCompare(a.date));

  const latest = rows[0];
  if (!latest?.value) return null;

  return {
    country_code: countryCode.toUpperCase(),
    cpi_index: Math.round(latest.value * 10) / 10,
    groceries_index: Math.round(latest.value * 10) / 10,
    restaurant_index: Math.round(latest.value * 10) / 10,
    period: latest.date,
    source: "world-bank",
  };
}

export async function resolveCountryHicpSnapshot(
  countryCode: string,
  eurostatMap: Map<string, CountryHicpSnapshot>,
  forceRefresh = false,
): Promise<CountryHicpSnapshot | null> {
  const code = countryCode.toUpperCase();
  const fromEurostat = eurostatMap.get(code);
  if (fromEurostat) return fromEurostat;

  return fetchCountryCpiFromWorldBank(code, forceRefresh);
}
