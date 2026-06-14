import { fetchWithCache } from "@/lib/cache/api-cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GeoPoint, WeatherSummary } from "@/types/domain";

const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const HISTORICAL_API = "https://archive-api.open-meteo.com/v1/archive";

type OpenMeteoForecastResponse = {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
    uv_index_max: number[];
  };
};

export async function fetchWeatherForRange({
  location,
  destinationId,
  dateFrom,
  dateTo,
  forceRefresh = false,
}: {
  location: GeoPoint;
  destinationId: string;
  dateFrom: string;
  dateTo: string;
  forceRefresh?: boolean;
}): Promise<WeatherSummary> {
  const today = new Date();
  const forecastLimit = new Date(today);
  forecastLimit.setDate(today.getDate() + 16);

  const targetFrom = new Date(dateFrom);
  const useHistorical = targetFrom > forecastLimit;

  const supabase = createAdminClient();

  if (useHistorical) {
    const lastYearFrom = shiftYearBack(dateFrom);
    const lastYearTo = shiftYearBack(dateTo);
    return fetchHistoricalWeather({
      location,
      destinationId,
      dateFrom: lastYearFrom,
      dateTo: lastYearTo,
      labelDateFrom: dateFrom,
      labelDateTo: dateTo,
      forceRefresh,
    });
  }

  const { data } = await fetchWithCache<OpenMeteoForecastResponse>({
    source: "open-meteo-forecast",
    cacheParams: { lat: location.lat, lon: location.lon, dateFrom, dateTo },
    ttlSeconds: 6 * 60 * 60,
    forceRefresh,
    fetcher: async () => {
      const params = new URLSearchParams({
        latitude: location.lat.toString(),
        longitude: location.lon.toString(),
        start_date: dateFrom,
        end_date: dateTo,
        daily: [
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
          "precipitation_probability_max",
          "weather_code",
          "wind_speed_10m_max",
          "uv_index_max",
        ].join(","),
        timezone: "auto",
      });

      const response = await fetch(`${FORECAST_API}?${params}`);
      if (!response.ok) {
        throw new Error(`Open-Meteo forecast error: ${response.status}`);
      }
      return response.json() as Promise<OpenMeteoForecastResponse>;
    },
  });

  const dailyRows = data.daily.time.map((date, i) => ({
    destination_id: destinationId,
    forecast_date: date,
    temp_max: data.daily.temperature_2m_max[i],
    temp_min: data.daily.temperature_2m_min[i],
    precipitation_mm: data.daily.precipitation_sum[i],
    precipitation_probability: data.daily.precipitation_probability_max[i],
    weather_code: data.daily.weather_code[i],
    wind_speed_kmh: data.daily.wind_speed_10m_max[i],
    uv_index_max: data.daily.uv_index_max[i],
    source: "open-meteo-forecast",
  }));

  await supabase
    .from("weather_cache")
    .upsert(dailyRows, { onConflict: "destination_id,forecast_date" });

  return summarizeWeather(data, destinationId, dateFrom, dateTo);
}

async function fetchHistoricalWeather({
  location,
  destinationId,
  dateFrom,
  dateTo,
  labelDateFrom,
  labelDateTo,
  forceRefresh,
}: {
  location: GeoPoint;
  destinationId: string;
  dateFrom: string;
  dateTo: string;
  labelDateFrom: string;
  labelDateTo: string;
  forceRefresh: boolean;
}): Promise<WeatherSummary> {
  const { data } = await fetchWithCache<OpenMeteoForecastResponse>({
    source: "open-meteo-historical",
    cacheParams: { lat: location.lat, lon: location.lon, dateFrom, dateTo },
    ttlSeconds: 30 * 24 * 60 * 60,
    forceRefresh,
    fetcher: async () => {
      const params = new URLSearchParams({
        latitude: location.lat.toString(),
        longitude: location.lon.toString(),
        start_date: dateFrom,
        end_date: dateTo,
        daily: [
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
          "weather_code",
          "wind_speed_10m_max",
        ].join(","),
        timezone: "auto",
      });

      const response = await fetch(`${HISTORICAL_API}?${params}`);
      if (!response.ok) {
        throw new Error(`Open-Meteo historical error: ${response.status}`);
      }
      const json = (await response.json()) as OpenMeteoForecastResponse;
      json.daily.uv_index_max = json.daily.time.map(() => 0);
      json.daily.precipitation_probability_max =
        json.daily.precipitation_sum.map((p) => (p > 0 ? 100 : 0));
      return json;
    },
  });

  const supabase = createAdminClient();
  const dailyRows = data.daily.time.map((date, i) => ({
    destination_id: destinationId,
    forecast_date: date,
    temp_max: data.daily.temperature_2m_max[i],
    temp_min: data.daily.temperature_2m_min[i],
    precipitation_mm: data.daily.precipitation_sum[i],
    precipitation_probability: data.daily.precipitation_probability_max[i],
    weather_code: data.daily.weather_code[i],
    wind_speed_kmh: data.daily.wind_speed_10m_max[i],
    uv_index_max: data.daily.uv_index_max[i],
    source: "open-meteo-historical",
  }));

  await supabase
    .from("weather_cache")
    .upsert(dailyRows, { onConflict: "destination_id,forecast_date" });

  return summarizeWeather(data, destinationId, labelDateFrom, labelDateTo, true);
}

function summarizeWeather(
  data: OpenMeteoForecastResponse,
  destinationId: string,
  dateFrom: string,
  dateTo: string,
  _isHistorical = false,
): WeatherSummary {
  const tempMaxAvg = avg(data.daily.temperature_2m_max);
  const tempMinAvg = avg(data.daily.temperature_2m_min);
  const totalPrecip = sum(data.daily.precipitation_sum);
  const rainyDays = data.daily.precipitation_sum.filter((p) => p > 1).length;
  const uvAvg = avg(data.daily.uv_index_max);

  return {
    destination_id: destinationId,
    date_from: dateFrom,
    date_to: dateTo,
    avg_temp_max: round(tempMaxAvg),
    avg_temp_min: round(tempMinAvg),
    total_precipitation_mm: round(totalPrecip),
    rainy_days: rainyDays,
    avg_uv_index: round(uvAvg),
    fetched_at: new Date().toISOString(),
  };
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function shiftYearBack(date: string): string {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split("T")[0];
}
