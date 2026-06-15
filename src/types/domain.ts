import type { Database } from "./database";

export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type TravelGroup = Database["public"]["Tables"]["travel_groups"]["Row"];
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];
export type GroupPreferences =
  Database["public"]["Tables"]["group_preferences"]["Row"];

export type MemberType = Database["public"]["Enums"]["member_type"];
export type TravelStyle = Database["public"]["Enums"]["travel_style"];

export type FullTravelGroup = TravelGroup & {
  members: GroupMember[];
  preferences: GroupPreferences | null;
};

export type NewTravelGroup =
  Database["public"]["Tables"]["travel_groups"]["Insert"];
export type NewGroupMember =
  Database["public"]["Tables"]["group_members"]["Insert"];
export type NewGroupPreferences =
  Database["public"]["Tables"]["group_preferences"]["Insert"];

export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  adult: "Dorosły",
  child: "Dziecko",
  infant: "Niemowlę",
  senior: "Senior",
};

export const TRAVEL_STYLE_LABELS: Record<TravelStyle, string> = {
  active: "Aktywny",
  relax: "Relaks",
  mixed: "Mieszany",
};

export type Airport = Database["public"]["Tables"]["airports"]["Row"];
export type FlightOfferCacheRow =
  Database["public"]["Tables"]["flight_offers_cache"]["Row"];
export type Hotel = Database["public"]["Tables"]["hotels"]["Row"];
export type HotelOfferCacheRow =
  Database["public"]["Tables"]["hotel_offers_cache"]["Row"];
export type AirportTransportBaselineRow =
  Database["public"]["Tables"]["airport_transport_baseline"]["Row"];
export type TransportOfferCacheRow =
  Database["public"]["Tables"]["transport_offers_cache"]["Row"];
export type Trip = Database["public"]["Tables"]["trips"]["Row"];
export type TripDocument = Database["public"]["Tables"]["trip_documents"]["Row"];
export type TripAdvisory = Database["public"]["Tables"]["trip_advisories"]["Row"];
export type CountryHoliday = Database["public"]["Tables"]["country_holidays"]["Row"];
export type SearchHistoryEntry =
  Database["public"]["Tables"]["search_history"]["Row"];
export type TripComparisonRow =
  Database["public"]["Tables"]["trip_comparisons"]["Row"];
export type SearchType = Database["public"]["Enums"]["search_type"];
export type AdvisoryCategory = Database["public"]["Enums"]["advisory_category"];
export type AdvisorySeverity = Database["public"]["Enums"]["advisory_severity"];
export type TripStatus = Database["public"]["Enums"]["trip_status"];
export type DocumentType = Database["public"]["Enums"]["document_type"];
export type AirportSize = Database["public"]["Enums"]["airport_size"];
export type DestinationSummaryRow =
  Database["public"]["Tables"]["destination_summaries"]["Row"];
export type DestinationBuildRow =
  Database["public"]["Tables"]["destination_builds"]["Row"];
export type BuildStatus = Database["public"]["Enums"]["build_status"];
export type Destination = Database["public"]["Tables"]["destinations"]["Row"];
export type Attraction = Database["public"]["Tables"]["attractions"]["Row"];
export type ApiCacheEntry = Database["public"]["Tables"]["api_cache"]["Row"];
export type WeatherCacheEntry =
  Database["public"]["Tables"]["weather_cache"]["Row"];

export type DestinationType = Database["public"]["Enums"]["destination_type"];

export type BoundingBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type GeoPoint = {
  lat: number;
  lon: number;
};

export type WeatherSummary = {
  destination_id: string;
  date_from: string;
  date_to: string;
  avg_temp_max: number;
  avg_temp_min: number;
  total_precipitation_mm: number;
  rainy_days: number;
  avg_uv_index: number;
  fetched_at: string;
};

export type ActivityGroup =
  Database["public"]["Tables"]["activity_groups"]["Row"];
export type Activity = Database["public"]["Tables"]["activities"]["Row"];
export type ActivityOsmMapping =
  Database["public"]["Tables"]["activity_osm_mappings"]["Row"];
export type AttractionActivityTag =
  Database["public"]["Tables"]["attraction_activity_tags"]["Row"];

export type IntensityLevel = Database["public"]["Enums"]["intensity_level"];
export type WeatherDependency =
  Database["public"]["Enums"]["weather_dependency"];

export type ActivityGroupWithActivities = ActivityGroup & {
  activities: Activity[];
};

export type AttractionWithActivities = Attraction & {
  activity_tags: { activity_slug: string; confidence: number }[];
};

export type GeoCluster = {
  id: string;
  center: GeoPoint;
  bbox: BoundingBox;
  radius_km: number;
  attractions: AttractionWithActivities[];
  covered_activities: string[];
  score: number;
  activity_counts: Record<string, number>;
  /** Miejscowość bazowa na nocleg — centrum klastra jest tu, nie w „środku lasu”. */
  settlement?: {
    name: string;
    lat: number;
    lon: number;
    country_code?: string;
  };
};

export type ActivitySearchQuery = {
  activities: string[];
  match_mode: "all" | "any";
  max_radius_km: number;
  min_per_activity: number;
  near_lat?: number;
  near_lon?: number;
  near_radius_km?: number;
  exploration_scope?: "local" | "region" | "island" | "roadtrip";
};

export type ActivitySearchResult = {
  query: ActivitySearchQuery;
  clusters: GeoCluster[];
  total_attractions_considered: number;
  duration_ms: number;
  meta?: {
    tag_rows_fetched: number;
    geo_radius_km_used: number | null;
    attractions_in_bbox: number;
    osm_filled?: boolean;
  };
};
