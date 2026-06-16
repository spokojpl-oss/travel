import { fetchWithCache } from "@/lib/cache/api-cache";
import type { GeoPoint } from "@/types/domain";

const ARCHIVE_API = "https://archive-api.open-meteo.com/v1/archive";

/** Lata używane do obliczenia norm klimatycznych (średnie miesięczne). */
export const CLIMATE_SAMPLE_START_YEAR = 2020;
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

/** Progi temperatury (°C) dla oceny komfortu podróży. */
const HEAT_EXTREME = 38;
const HEAT_HIGH = 35;
const HEAT_WARM = 32;
const COLD_HARSH = 8;
const COLD_COOL = 12;

export function rateClimateMonth({
  tempMax,
  rainyDays,
  precipMm,
}: {
  tempMax: number;
  rainyDays: number;
  precipMm: number;
}): ClimateRating {
  // Upał i mrozy dominują nad resztą heurystyki
  if (tempMax >= HEAT_EXTREME) return "very_poor";
  if (tempMax >= HEAT_HIGH) return "poor";

  if (tempMax < COLD_HARSH) return "very_poor";
  if (tempMax < COLD_COOL) return "poor";

  if (rainyDays > 12 || precipMm > 150) return "very_poor";
  if (rainyDays > 8 || precipMm > 100) return "poor";

  // Sweet spot na city break / plażę
  if (tempMax >= 22 && tempMax <= 30 && rainyDays <= 3 && precipMm <= 40) {
    return "ideal";
  }

  // Ciepło, ale komfortowo (do ~32°C)
  if (tempMax >= 18 && tempMax <= 32 && rainyDays <= 6 && precipMm <= 70) {
    return "good";
  }

  // Sezon przejściowy lub gorąco (32–34°C) przy umiarkowanym deszczu
  if (tempMax >= 14 && tempMax <= 34 && rainyDays <= 10 && precipMm <= 120) {
    return "fair";
  }

  return "poor";
}

export function climateRatingLabel(
  rating: ClimateRating,
  {
    tempMax,
    rainyDays,
  }: {
    tempMax: number;
    rainyDays?: number;
  },
): string {
  if (tempMax >= HEAT_EXTREME) return "Ekstremalny upał";
  if (tempMax >= HEAT_HIGH) return "Upał";
  if (tempMax >= HEAT_WARM && rating !== "ideal") return "Bardzo gorąco";
  if (tempMax < COLD_HARSH) return "Za zimno";
  if (tempMax < COLD_COOL) return "Chłodno";
  if (
    (rainyDays ?? 0) >= 10 &&
    (rating === "poor" || rating === "very_poor")
  ) {
    return "Deszczowo";
  }
  return CLIMATE_RATING_LABELS_PL[rating];
}

export function resolveClimateMonth(
  row: Omit<MonthlyClimateNormal, "climate_rating"> & {
    climate_rating?: ClimateRating;
  },
): MonthlyClimateNormal {
  const climate_rating = rateClimateMonth({
    tempMax: row.temp_max_avg,
    rainyDays: row.rainy_days_avg,
    precipMm: row.precip_mm_avg,
  });
  return { ...row, climate_rating };
}

export function climateMonthForDisplay(
  row: Omit<MonthlyClimateNormal, "climate_rating"> & {
    climate_rating?: ClimateRating;
  },
): MonthlyClimateNormal & { rating_label: string } {
  const resolved = resolveClimateMonth(row);
  return {
    ...resolved,
    rating_label: climateRatingLabel(resolved.climate_rating, {
      tempMax: resolved.temp_max_avg,
      rainyDays: resolved.rainy_days_avg,
    }),
  };
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
    poor: 1,
    very_poor: 0,
  };

  const resolved = normals.map((row) => resolveClimateMonth(row));

  return [...resolved]
    .filter(
      (n) => n.climate_rating !== "poor" && n.climate_rating !== "very_poor",
    )
    .sort(
      (a, b) =>
        score[b.climate_rating] - score[a.climate_rating] ||
        Math.abs(a.temp_max_avg - 26) - Math.abs(b.temp_max_avg - 26),
    )
    .slice(0, limit)
    .map((n) => n.month);
}

export const CLIMATE_RATING_LABELS_PL: Record<ClimateRating, string> = {
  ideal: "Idealna pogoda",
  good: "Dobra pogoda",
  fair: "Przeciętna pogoda",
  poor: "Słabe warunki",
  very_poor: "Bardzo słabe warunki",
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
