import type {
  Trip,
  Destination,
  Attraction,
  Airport,
  WeatherCacheEntry,
  TravelGroup,
  GroupPreferences,
} from "@/types/domain";

export type AdvisorySeverity = "info" | "suggestion" | "warning" | "critical";

export type AdvisoryCategory =
  | "flights_dates"
  | "airport_choice"
  | "open_jaw"
  | "accommodation_location"
  | "seasonal_event"
  | "weather_plan_b"
  | "review_red_flag"
  | "timing_concern";

export type Advisory = {
  category: AdvisoryCategory;
  severity: AdvisorySeverity;
  title: string;
  reasoning: string;
  suggested_action?: string;
  source_facts: Record<string, unknown>;
  estimated_savings_pln?: number;
};

export type GroupComposition = {
  adults: number;
  children_ages: number[];
  total: number;
};

export type AdvisorContext = {
  trip: Trip;
  destination: Destination;
  selectedAttractions: Attraction[];
  selectedHotel?: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    address?: string | null;
    stars?: number | null;
  };
  selectedAirport?: Airport;
  weatherDays?: Pick<
    WeatherCacheEntry,
    | "forecast_date"
    | "temp_max"
    | "temp_min"
    | "precipitation_mm"
    | "precipitation_probability"
  >[];
  group: GroupComposition;
  travelGroup?: TravelGroup;
  preferences?: GroupPreferences;
};

export interface Advisor {
  category: AdvisoryCategory;
  analyze(context: AdvisorContext): Promise<Advisory[]>;
}

export const SEVERITY_ORDER: Record<AdvisorySeverity, number> = {
  critical: 0,
  warning: 1,
  suggestion: 2,
  info: 3,
};
