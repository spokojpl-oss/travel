import { fetchWithCache } from "@/lib/cache/api-cache";
import type { GeoPoint } from "@/types/domain";

const ARCHIVE_API = "https://archive-api.open-meteo.com/v1/archive";

/** Lata używane do obliczenia norm klimatycznych (średnie miesięczne). */
export const CLIMATE_SAMPLE_START_YEAR = 2010;
export const CLIMATE_SAMPLE_END_YEAR = 2023;

export type ClimateRating =
  | "ideal"
  | "good"
  | "fair"
  | "poor"
  | "very_poor";

export type MonthlyClimateNormal = {
  month: number;
  temp_max_avg: number;
  temp_min_avg: number;
  precip_mm_avg: number;
  rainy_days_avg: number;
  climate_rating: ClimateRating;
};

type ArchiveDailyResponse = {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
};

type MonthBucket = {
  tempMax: number[];
  tempMin: number[];
  precip: number[];
  rainyDays: number[];
};

export function rateClimateMonth({
  tempMax,
  rainyDays,
  precipMm,
}: {
  tempMax: number;
  rainyDays: number;
  precipMm: number;
}): ClimateRating {
  // Heurystyka podróży słonecznych / city break (jak gdzie-i-kiedy)
  if (tempMax >= 24 && tempMax <= 32 && rainyDays <= 3 && precipMm <= 40) {
    return "ideal";
  }
  if (tempMax >= 20 && tempMax <= 34 && rainyDays <= 6 && precipMm <= 70) {
    return "good";
  }
  if (tempMax >= 14 && tempMax <= 38 && rainyDays <= 10 && precipMm <= 120) {
    return "fair";
  }
  if (rainyDays <= 14 && tempMax >= 8 && tempMax <= 42) {
    return "poor";
  }
  return "very_poor";
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function aggregateByMonth(data: ArchiveDailyResponse): MonthlyClimateNormal[] {
  const buckets = new Map<number, MonthBucket>();

  for (let i = 0; i < data.daily.time.length; i++) {
    const date = data.daily.time[i]!;
    const month = Number.parseInt(date.slice(5, 7), 10);
    const bucket = buckets.get(month) ?? {
      tempMax: [],
      tempMin: [],
      precip: [],
      rainyDays: [],
    };

    const precip = data.daily.precipitation_sum[i] ?? 0;
    bucket.tempMax.push(data.daily.temperature_2m_max[i] ?? 0);
    bucket.tempMin.push(data.daily.temperature_2m_min[i] ?? 0);
    bucket.precip.push(precip);
    bucket.rainyDays.push(precip > 1 ? 1 : 0);
    buckets.set(month, bucket);
  }

  const normals: MonthlyClimateNormal[] = [];
  for (let month = 1; month <= 12; month++) {
    const bucket = buckets.get(month);
    if (!bucket || bucket.tempMax.length === 0) continue;

    const tempMaxAvg = avg(bucket.tempMax);
    const tempMinAvg = avg(bucket.tempMin);
    const precipMmAvg = avg(bucket.precip);
    const rainyDaysAvg = avg(bucket.rainyDays);

    normals.push({
      month,
      temp_max_avg: round1(tempMaxAvg),
      temp_min_avg: round1(tempMinAvg),
      precip_mm_avg: round1(precipMmAvg),
      rainy_days_avg: round1(rainyDaysAvg),
      climate_rating: rateClimateMonth({
        tempMax: tempMaxAvg,
        rainyDays: rainyDaysAvg,
        precipMm: precipMmAvg,
      }),
    });
  }

  return normals;
}

export async function fetchMonthlyClimateNormals({
  location,
  forceRefresh = false,
}: {
  location: GeoPoint;
  forceRefresh?: boolean;
}): Promise<MonthlyClimateNormal[]> {
  const startDate = `${CLIMATE_SAMPLE_START_YEAR}-01-01`;
  const endDate = `${CLIMATE_SAMPLE_END_YEAR}-12-31`;

  const { data } = await fetchWithCache<ArchiveDailyResponse>({
    source: "open-meteo-climate-normals",
    cacheParams: {
      lat: location.lat,
      lon: location.lon,
      startDate,
      endDate,
    },
    ttlSeconds: 90 * 24 * 60 * 60,
    forceRefresh,
    fetcher: async () => {
      const params = new URLSearchParams({
        latitude: location.lat.toString(),
        longitude: location.lon.toString(),
        start_date: startDate,
        end_date: endDate,
        daily: [
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
        ].join(","),
        timezone: "auto",
      });

      const response = await fetch(`${ARCHIVE_API}?${params}`);
      if (!response.ok) {
        throw new Error(`Open-Meteo archive error: ${response.status}`);
      }
      return response.json() as Promise<ArchiveDailyResponse>;
    },
  });

  return aggregateByMonth(data);
}

export function bestMonthsForTravel(
  normals: MonthlyClimateNormal[],
  limit = 6,
): number[] {
  const score: Record<ClimateRating, number> = {
    ideal: 5,
    good: 4,
    fair: 3,
    poor: 2,
    very_poor: 1,
  };

  return [...normals]
    .sort(
      (a, b) =>
        score[b.climate_rating] - score[a.climate_rating] ||
        b.temp_max_avg - a.temp_max_avg,
    )
    .slice(0, limit)
    .map((n) => n.month);
}

export const CLIMATE_RATING_LABELS_PL: Record<ClimateRating, string> = {
  ideal: "Idealna pogoda",
  good: "Dobra pogoda",
  fair: "Znośna pogoda",
  poor: "Słaba pogoda",
  very_poor: "Bardzo słaba pogoda",
};

export const MONTH_NAMES_PL = [
  "",
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];
